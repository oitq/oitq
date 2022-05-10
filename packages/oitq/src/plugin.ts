import * as path from "path";
import * as fs from 'fs'
import {App, Bot, Dispose, Middleware, NSession} from "./index";
import {Awaitable, createIfNotExist, readConfig, remove, writeConfig} from "@oitq/utils";
import {Context} from "./context";
import {Command} from "./command";
import {Action} from "./argv";
import {EventMap, Sendable} from "oicq";


class PluginError extends Error {
    name = "PluginError"
}

export enum PluginType {
    Builtin = 'builtin',// 内置插件
    Official = 'official',// 官方插件
    Community = 'community',// 社区插件
    Custom = 'custom',// 自定义插件
}

export interface PluginDesc {
    name: string
    type: PluginType
    fullName?: string
    desc?: string
    author?: string
    version?: string
    isInstall?: boolean
    binds?: number[]
}

export interface PluginConfig {
    name: string,
    config?: any
}

export class Plugin extends Context {
    public readonly fullpath: string
    public readonly path: string
    protected hooks: PluginManager.Object
    public parent:Plugin=null
    public children:Plugin[]=[]
    private _commands:Map<string,Command>=new Map<string, Command>()
    public disposes:Dispose[]=[]
    middlewares: Middleware[] = []
    public commandList:Command[]=[]
    readonly binds = new Set<Bot>()
    private _using: readonly (keyof App.Services)[] = []
    disableStatus:boolean=false
    config
    public pluginManager:PluginManager
    constructor(public readonly name: string, hooks: string | PluginManager.Object) {
        super()
        if (typeof hooks === 'string') {
            this.fullpath = require.resolve(hooks)
            this._using = require(hooks).using || []
            this.path = hooks
        } else {
            if (hooks.using) this._using = hooks.using
            this.hooks = hooks
        }
        this.on("bot.*",(session)=>{
            this.dispatch(session.event_name,session)
        })
    }
    //message处理中间件，受拦截的message不会上报到'bot.message'
    middleware(middleware: Middleware, prepend?: boolean) {
        const method = prepend ? 'unshift' : 'push'
        this.middlewares[method](middleware)
        return () => {
            const index = this.app.middlewares.indexOf(middleware)
            if (index >= 0) {
                this.app.middlewares.splice(index, 1)
                return true
            }
            return false
        }
    }
    async executeCommand(session:NSession<'message'>,content=session.cqCode||''):Promise<boolean|Sendable|void> {
        const argv = Action.parse(content)
        argv.bot = session.bot
        argv.session = session
        const command=this.findCommand(argv,this.commandList.filter(command=>command.match(session)))
        if(command){
            let result
            try{
                result = await command.execute(argv)
            }catch (e){
                this.logger.warn(e.message)
            }
            if (result) return result
        }
    }
    findCommand(argv:Pick<Action, 'name'|'source'>,commandList:Command[]=this.commandList) {
        return commandList.find(cmd => {
            return cmd.name===argv.name
                || cmd.aliasNames.includes(argv.name)
                || cmd.shortcuts.some(({name})=>typeof name==='string'?name===argv.name:name.test(argv.source))
        })
    }
    private async dispatch<K extends keyof EventMap>(name:K,session:NSession<K>){
        if(this.disableStatus)return
        if(name&&name.startsWith('message')){
            const session1=session as NSession<'message'>
            let result=await this.executeCommand(session1)
            if(result){
                if(typeof result!=='boolean'){
                    session.reply(result)
                }
                return
            }
            for(const middleware of this.app.middlewares){
                result =await middleware(session1)
                if(result){
                    if(typeof result!=='boolean'){
                        session.reply(result)
                    }
                    return
                }
            }
        }
        for(const plugin of this.children){
            plugin.emit(`bot.${name}`,session)
        }
    }
    get commands():Command[]{
        return [].concat(this.commandList,...this.children.map(plugin=>plugin.commands)).flat()
    }
    getCommand(name:string){
        return this.commands.find(command=>command.name===name)
    }
    using<T extends PluginManager.Plugin>(using: readonly (keyof App.Services)[], plugin:T,config?:PluginManager.Option<T>) {
        if(typeof plugin==='function'){
            plugin={install:plugin,name:plugin.name} as T
        }
        return this.plugin({ using,...plugin},config)
    }
    plugin(name:string,config?:any):this
    plugin<T extends PluginManager.Plugin>(plugin:T,config?:PluginManager.Option<T>):this
    plugin(entry: string|PluginManager.Plugin, config?: any):this{
        let plugin:Plugin
        if(typeof entry==='string')plugin=this.app.pluginManager.import(entry)
        else{
            if(typeof entry==='function')entry={install:entry,name:config?.name||entry?.name||Math.random().toString()}
            plugin=new Plugin(entry?.name||Math.random().toString(),entry)
        }
        const using = plugin['_using'] || []
        this.children.push(plugin)
        this.disposes.push(()=>{
            plugin.dispose()
            return remove(this.children,plugin)
        })
        plugin.parent=this
        plugin.app=this.app
        plugin.logger=this.getLogger(`[plugin:${plugin.name}]`)
        if (using.length) {
            this.on('service.load', async (name) => {
                if (!using.includes(name)) return
                callback()
            })
        }
        const callback = () => {
            if (using.some(name => !this[name])) return
            this.app.pluginManager.install(plugin,config)
        }
        callback()
        return this
    }
    command<D extends string>(def: D,triggerEvent:keyof EventMap): Command<Action.ArgumentType<D>> {
        const name=Command.removeDeclarationArgs(def)
        const segments = name.split(/(?=[./])/g)

        let parent: Command, root: Command
        segments.forEach((segment, index) => {
            const code = segment.charCodeAt(0)
            const name = code === 46 ? parent.name + segment : code === 47 ? segment.slice(1) : segment
            let command = this._commands.get(name)
            if (command) {
                if (parent) {
                    if (command === parent) {
                        throw new Error(`cannot set a command (${command.name}) as its own subcommand`)
                    }
                    if (command.parent) {
                        if (command.parent !== parent) {
                            throw new Error(`cannot create subcommand ${path}: ${command.parent.name}/${command.name} alconnect exists`)
                        }
                    } else {
                        command.parent = parent
                        parent.children.push(command)
                    }
                }
                return parent = command
            }
            command = new Command(def,this,triggerEvent)
            this._commands.set(name,command)
            this.commandList.push(command)
            this.disposes.push(()=>remove(this.commandList,command),()=>{
                this._commands.delete(name)
                return true
            })
            this.emit('command.add',command)
            if (!root) root = command
            if (parent) {
                command.parent = parent
                parent.children.push(command)
            }
            parent = command
        })
        return Object.create(parent)
    }

    protected async _editBotPluginCache(bot: Bot, method: "add" | "delete") {
        const dir = path.join(bot.dir, "plugin")
        createIfNotExist(dir, [])
        let set: Set<string>
        try {
            const arr = readConfig(dir) as string[]
            set = new Set(arr)
        } catch {
            set = new Set
        }
        set[method](this.name)
        return writeConfig(dir, Array.from(set))
    }

    async install(config?: any) {
        if(config)this.config=config
        else config=this.config
        if (this.path) {
            require(this.path)
            const mod = require.cache[this.fullpath]
            this.hooks = mod.exports
        }
        if (typeof this.hooks.install !== "function") {
            throw new PluginError(`插件(${this.name})未导出install方法，无法安装。`)
        }
        const res = this.hooks.install(this.app, config)
        if (res instanceof Promise)
            await res
        this.logger.info(`已成功安装`)
    }
    async enable(bot: Bot=null) {
        if(!bot && this.disableStatus){
            this.disableStatus=false
            this.logger.info(`已启用`)
            return
        }
        if(this.disableStatus){
            this.logger.info(`重复启用`)
            return
        }
        if (this.binds.has(bot)) {
            throw new PluginError(`这个机器人实例已经启用了插件(${this.name})`)
        }
        await this._editBotPluginCache(bot, "add")
        this.binds.add(bot)
        this.logger.info(`成功对机器人${bot.uin}启用`)
    }

    async disable(bot: Bot=null) {
        if(!bot && !this.disableStatus){
            this.disableStatus=true
            this.logger.info(`已禁用`)
            return
        }
        if(this.disableStatus){
            this.logger.info(`重复禁用`)
            return
        }
        if (!this.binds.has(bot)) {
            throw new PluginError(`这个机器人实例尚未启用插件(${this.name})`)
        }
        await this._editBotPluginCache(bot, "delete")
        this.binds.delete(bot)
        this.logger.info(`成功对机器人${bot.uin}禁用`)
    }

    async destroy(plugin:Plugin=this) {
        this.logger.info(`正在卸载...`)

        plugin.dispose()
    }
    dispose(){
        while (this.disposes.length){
            this.disposes.shift()()
        }
        if(this.parent){
            remove(this.parent.children,this)
        }
    }
    async restart() {

        this.logger.info(`正在重新安装...`)
        try {
            await this.destroy()
            await this.install(this.config)
            for (let bot of this.binds) {
                await this.enable(bot)
            }
        } catch (e) {
            throw new PluginError(`重启插件(${this.name})时遇到错误。\n错误信息：` + e.message)
        }
    }
}

export class PluginManager {
    public plugins: Map<string, Plugin> = new Map<string, Plugin>()
    constructor(public app: App, public plugin_dir:string) {
    }
    get logger(){
        return this.app.getLogger('pluginManager')
    }
    getLogger(category:string){
        return this.app.getLogger(category)
    }
    init(plugins:Record<string, boolean|Record<string, any>>) {
        for (const [name, conf] of Object.entries(plugins)) {
            try {
                this.app.plugin(name,conf)
            } catch (e) {
                if (e instanceof PluginError) {
                    this.logger.warn(e.message)
                } else {
                    throw e
                }
            }
        }

    }
    import(name: string) {
        if (this.plugins.has(name))
            return this.plugins.get(name)
        let resolved = ""
        const modulePath = path.join(process.cwd(), "node_modules")
        const orgPath = path.resolve(modulePath, '@oitq')
        // 查找内置插件
        try{
            require.resolve(path.join(__dirname,`plugins/${name}`))
            resolved=`${__dirname}/plugins/${name}`
        }catch {}
        if(!resolved && fs.existsSync(this.plugin_dir)){
            try {
                require.resolve(`${this.plugin_dir}/${name}`)
                resolved = `${this.plugin_dir}/${name}`
            } catch {
            }
        }
        if(!resolved){//尝试在全局包里面查找官方插件
            try {
                require.resolve('@oitq/plugin-' + name);
                resolved = '@oitq/plugin-' + name;
            }catch {}
        }
        if(!resolved){//尝试在全局包里面查找社区插件
            try {
                require.resolve('oitq-plugin-' + name);
                resolved = 'oitq-plugin-' + name;
            }catch {}
        }
        if (!resolved && fs.existsSync(orgPath)) {//尝试在当前目录的依赖查找官方插件
            try{
                require.resolve(modulePath+'/'+'@oitq/plugin-' + name);
                resolved = modulePath+'/'+'@oitq/plugin-' + name;
            }catch{}
        }
        if (!resolved && fs.existsSync(modulePath)) {//尝试在当前目录的依赖查找社区插件
            try{
                require.resolve(modulePath+'/'+'oitq-plugin-' + name);
                resolved = modulePath+'/'+'oitq-plugin-' + name;
            }catch{}
        }
        if (!resolved)
            throw new PluginError(`插件名错误，无法找到插件(${name})`)
        return new Plugin(name, resolved)
    }

    install(plugin: Plugin, config?) {
        plugin.install(config)
        this.plugins.set(plugin.name, plugin)
    }

    checkInstall(name: string) {
        if (!this.plugins.has(name)) {
            throw new PluginError(`尚未安装插件(${name})`)
        }
        return this.plugins.get(name)
    }

    async destroy(name: string) {
        await this.checkInstall(name).destroy()
        this.plugins.delete(name)
    }

    restart(name: string) {
        return this.checkInstall(name).restart()
    }

    enable(name: string, bot: Bot) {
        return this.checkInstall(name).enable(bot)
    }

    disable(name: string, bot: Bot) {
        return this.checkInstall(name).disable(bot)
    }

    async disableAll(bot: Bot) {
        for (let [_, plugin] of this.plugins) {
            try {
                await plugin.disable(bot)
            } catch {
            }
        }
    }

    loadAllPlugins(): PluginDesc[] {
        const custom_plugins: PluginDesc[] = [], module_plugins: PluginDesc[] = [], builtin_plugins: PluginDesc[] = []
        const modulePath = path.join(process.cwd(), "node_modules")
        const orgPath = path.join(modulePath, '@oitq')
        // 列出的插件不展示内置插件
        const builtinPath = path.join(__dirname, 'plugins')
        const builtinPlugins = fs.readdirSync(builtinPath, {withFileTypes: true})
        for (let file of builtinPlugins) {
            if (file.isDirectory()) {
                try {
                    require.resolve(`${builtinPath}/${file.name}`)
                    builtin_plugins.push({
                        name: file.name,
                        type: PluginType.Builtin
                    })
                } catch {
                }
            } else if (file.isFile() && ((file.name.endsWith('.ts') && !file.name.endsWith('d.ts')) || file.name.endsWith('.js'))) {
                const fileName = file.name.replace(/\.ts|\.js/, '')
                try {
                    require.resolve(`${builtinPath}/${fileName}`)
                    builtin_plugins.push({
                        name: fileName,
                        type: PluginType.Builtin
                    })
                } catch {
                }
            }
        }
        if (fs.existsSync(this.plugin_dir)) {
            const customPlugins = fs.readdirSync(this.plugin_dir, {withFileTypes: true})
            for (let file of customPlugins) {
                if (file.isDirectory() || file.isSymbolicLink()) {
                    try {
                        require.resolve(`${this.plugin_dir}/${file.name}`)
                        custom_plugins.push({
                            name: file.name,
                            type: PluginType.Custom
                        })
                    } catch {
                    }
                }
            }
        }
        const modules = fs.readdirSync(modulePath, {withFileTypes: true})
        for (let file of modules) {
            if (file.isDirectory() && (file.name.startsWith("oitq-plugin-"))) {
                try {
                    require.resolve(file.name)
                    module_plugins.push({
                        name: file.name.replace('oitq-plugin-', ''),
                        type: PluginType.Community,
                        fullName: file.name
                    })
                } catch {
                }
            }
        }
        if (fs.existsSync(orgPath)) {
            const orgModules = fs.readdirSync(orgPath, {withFileTypes: true})
            for (let file of orgModules) {
                if (file.isDirectory() && file.name.startsWith('plugin-')) {
                    try {
                        require.resolve(`@oitq/${file.name}`)
                        module_plugins.push({
                            name: file.name.replace('plugin-', ''),
                            type: PluginType.Official,
                            fullName: `@oitq/${file.name}`
                        })
                    } catch {
                    }
                }
            }
        }
        const plugins: PluginDesc[] = [...this.plugins.values()].map(plugin => {
            return {
                name: plugin.name,
                type: PluginType.Custom
            }
        }).filter(plugin => {
            return !custom_plugins.map(desc => desc.name).includes(plugin.name) &&
                !module_plugins.map(desc => desc.name).includes(plugin.name) &&
                !builtin_plugins.map(desc => desc.name).includes(plugin.name)
        })
        return builtin_plugins.concat(custom_plugins).concat(module_plugins).concat(plugins).map(pluginDesc => {
            const plugin = this.plugins.get(pluginDesc.name)
            return {
                ...pluginDesc,
                isInstall: this.plugins.has(pluginDesc.name),
                binds: plugin ? Array.from(plugin.binds).map(bot => bot.uin) : []
            }
        })
    }

    /**
     * 恢复bot的插件服务
     * @param {Bot} bot
     */
    async restore(bot: Bot) {
        createIfNotExist(path.join(bot.dir, 'plugin'), [])
        const dir = path.join(bot.dir, "plugin")
        try {
            const arr = readConfig(dir) as string[]
            for (let name of arr) {
                try {
                    await this.checkInstall(name).enable(bot)
                } catch {
                }
            }
        } catch {
        }
        return this.plugins
    }
}

export namespace PluginManager {
    export const defaultConfig: Config = {
        plugin_dir: path.join(process.cwd(), 'plugins'),
        plugins: {}
    }
    export type Plugin = Function | Object
    export type Function<T = any> = (app: App, config: T) => Awaitable<any>

    export interface Object<T = any> {
        install: Function<T>
        using?: readonly (keyof App.Services)[]
        name?: string
        author?:string
    }

    export type Option<T extends Plugin> =
        | T extends Function<infer U> ? U
            : T extends Object<infer U> ? U
                : never

    export interface Config {
        plugin_dir?: string,
        plugins?: Record<string, any>
    }
}
export namespace Plugin {
    export interface State {
        context: Context,
        children:Context[]
        disposes: Dispose[]
        plugin: Plugin
    }
}
