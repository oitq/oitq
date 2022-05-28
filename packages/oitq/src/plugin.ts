import * as path from "path";
import * as fs from 'fs'
import {getLogger} from 'log4js'
import {App, Bot, BotList, Middleware, NSession} from "./index";
import {AppEventMap,BeforeEventMap,Dispose} from './types'
import {Awaitable, createIfNotExist, readConfig, remove, writeConfig} from "@oitq/utils";
import {Command} from "./command";
import {Action} from "./argv";
import {EventMap, Sendable} from "oicq";
import {EventThrower} from "./event";
export type AuthorInfo=string|{
    name:string
    email?:string
    url?:string
}
export type RepoInfo=string|{
    type?:'git'|'svn'
    directory?:string
    url:string
}
export interface PkgInfo{
    name:string
    version:string
    description:string
    author:AuthorInfo
    repository:RepoInfo
}
class PluginError extends Error {
    name = "PluginError"
}

export enum PluginType {
    Builtin = 'builtin',// 内置插件
    Official = 'official',// 官方插件
    Community = 'community',// 社区插件
    Custom = 'custom',// 自定义插件
}

export interface PluginDesc extends Partial<PkgInfo>{
    type: PluginType
    installed?: boolean
    disabled:boolean
    binds?: number[]
}
export interface Plugin extends Plugin.Services{
    on<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    on<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    before<E extends keyof BeforeEventMap>(name:E,listener:BeforeEventMap[E],append?:boolean):Dispose
    before<S extends string|symbol>(name:S & Exclude<S, keyof BeforeEventMap>,listener:(...args:any)=>void,append?:boolean):Dispose
    once<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    once<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    addEventListener<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    addEventListener<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    emit<E extends keyof AppEventMap>(name:E,...args:Parameters<AppEventMap[E]>):boolean
    emit<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,...args:any[]):boolean
}
export class Plugin extends EventThrower {
    static readonly immediate = Symbol('immediate')
    public app:App
    public readonly fullpath: string
    public readonly path: string
    protected hooks: PluginManager.ObjectHook
    public _using:(keyof Plugin.Services)[]
    public parent:Plugin=null
    public children:Plugin[]=[]
    public disposes:Dispose[]=[]
    readonly binds = new Set<Bot>()
    disableStatus:boolean=false
    config
    pkg:Partial<PkgInfo>={}
    public pluginManager:PluginManager
    constructor(hooks: string | PluginManager.ObjectHook) {
        super()
        if (typeof hooks === 'string') {
            this.fullpath = require.resolve(hooks)
            require(hooks)
            this.path = this.fullpath
            const mod=require.cache[this.fullpath]
            this._using=mod.exports.using||(mod.exports.default?mod.exports.default.using||[]:[])||[]
            try{
                const pkg=require(path.join(hooks,'package.json'))
                this.pkg={
                    name:pkg.name,
                    author:pkg.author,
                    description:pkg.description,
                    repository:pkg.repository,
                    version:pkg.version
                }
            }catch {}
        } else {
            if(hooks.name)this.pkg.name=hooks.name
            this.hooks = hooks
        }
        this.on("bot.*",(session)=>{
            this.dispatch(`bot.${session.event_name as keyof EventMap}`,session)
        })
        this.on('attach',session => {this.dispatch('attach',session)})
        this.on('plugin-add',plugin=>{this.children.push(plugin)})
        this.on('plugin-remove',(plugin)=>remove(this.children,plugin))
    }
    // 添加插件中事件监听的销毁
    on(name,listener,prepend){
        const dispose=super.on(name,listener,prepend)
        this.disposes.push(dispose)
        return dispose
    }
    before(name,listener,append){
        const dispose=super.before(name,listener,append)
        this.disposes.push(dispose)
        return dispose
    }
    getLogger(name: string) {
        const logger=getLogger(name)
        logger.level=process.env.OITQ_LOG_LEVEL||this.app.config.logLevel||'off'
        return logger
    }
    async dispatch(name:string,...args){
        if(this.disableStatus)return
        if(name && name.startsWith('bot.')){
            const session=args[0]
            if(name==='bot.message'){
                let result:any=await this.app.bail('continue',session)
                if(result){
                    if(typeof result!=='boolean'){
                        session.sendMsg(result)
                    }
                    return
                }
                for(const middleware of this.app.middlewares){
                    result=await middleware(session)
                    if(result){
                        if(typeof result!=='boolean'){
                            session.sendMsg(result)
                        }
                        return
                    }
                }
                result=await this.execute(session)
                if(result){
                    if(typeof result!=='boolean'){
                        session.sendMsg(result)
                    }
                    return
                }
            }
        }
        for(const plugin of this.children){
            await plugin.parallel(name,...args)
        }
    }
    getCommand(name:string){
        return this.app.commandList.find(command=>command.name===name)
    }
    //message处理中间件，受拦截的message不会上报到'bot.message'
    middleware(middleware: Middleware, prepend?: boolean) {
        const method = prepend ? 'unshift' : 'push'
        this.app.middlewares[method](middleware)
        const dispose=() => remove(this.app.middlewares,middleware)
        this.disposes.push(dispose)
        return dispose
    }
    use(middleware:Middleware){
        this.middleware(middleware)
        return this
    }
    using<T extends PluginManager.PluginHook>(using: readonly (keyof Plugin.Services)[], plugin:T,config?:PluginManager.Option<T>) {
        if(typeof plugin==='function'){
            plugin={install:plugin} as T
        }
        return this.plugin({ using,...plugin},config)
    }
    // 添加子插件
    addPlugin(plugin:Plugin,config?){
        this.children.push(plugin)
        plugin.parent=this
        plugin.app=this.app
        plugin.logger=this.getLogger(`[plugin:${plugin.pkg.name}]`)
        plugin.install(config)
        return this
    }
    // 定义子插件
    plugin(name:string,config?:any):this
    plugin<T extends PluginManager.PluginHook>(plugin:T,config?:PluginManager.Option<T>):this
    plugin(entry: string|PluginManager.PluginHook, config?: any):this{
        let plugin:Plugin
        if(typeof entry==='string')plugin=this.app.pluginManager.import(entry)
        else{
            if(typeof entry!=='function') plugin=new Plugin(entry)
            else plugin=new Plugin({install:entry,name:entry.name})
        }
        const using = plugin['_using'] || []
        plugin.parent=this
        plugin.app=this.app
        plugin.logger=this.getLogger(`[plugin:${plugin.pkg.name}]`)
        if (using.length) {
            this.app.on('service.load', async (name) => {
                if (!using.includes(name)) return
                await callback()
            })
        }
        const callback = async () => {
            if (using.some(n => !this[n])) return
            await this.app.pluginManager.install(plugin,config).catch(e=>{
                this.logger.warn(`安装${plugin.pkg.name}时遇到错误，错误信息：${e.message}:${e.stack}`)
            })
        }
        callback()
        return this
    }
    command<D extends string>(def: D,triggerEvent:keyof EventMap): Command<Action.ArgumentType<D>> {
        const namePath = def.split(' ', 1)[0]
        const decl = def.slice(namePath.length)
        const segments = namePath.split(/(?=[./])/g)

        let parent: Command, root: Command
        segments.forEach((segment, index) => {
            const code = segment.charCodeAt(0)
            const name = code === 46 ? parent.name + segment : code === 47 ? segment.slice(1) : segment
            let command = this.app.commandList.find(command=>command.name==name)
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
            command = new Command(name+decl,this,triggerEvent)
            this.app._commands.set(name,command)
            this.app.commandList.push(command)
            this.disposes.push(()=>{
                remove(this.app.commandList,command)
                this.app._commands.delete(name)
                this.app.emit('command-remove',command)
                return true
            })
            this.app.emit('command-add',command)
            if (!root) root = command
            if (parent) {
                command.parent = parent
                parent.children.push(command)
            }
            parent = command
        })
        return Object.create(parent)
    }
    async execute(session:NSession,content=session.cqCode||''):Promise<boolean|Sendable|void> {
        const argv = Action.parse(content)
        argv.bot = session.bot
        argv.session = session
        const command=this.findCommand(argv)
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

    findCommand(argv:Pick<Action, 'name'|'source'>,) {
        return this.app.commandList.find(cmd => {
            return cmd.name===argv.name
                || cmd.aliasNames.includes(argv.name)
                || cmd.shortcuts.some(({name})=>typeof name==='string'?name===argv.name:name.test(argv.source))
        })
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
        set[method](this.pkg.name||this.fullpath)
        return writeConfig(dir, Array.from(set))
    }

    async install(config?: any) {
        if(config)this.config=config
        else config=this.config
        if (this.path) {
            require(this.path)
            const mod = require.cache[this.fullpath]
            this.hooks = mod.exports
            this._using=mod.exports.using||(mod.exports.default?mod.exports.default.using||[]:[])||[]
        }
        if (typeof this.hooks.install !== "function" && !this.hooks['default']) {
            throw new PluginError(`插件(${this.pkg.name})未导出install方法，无法安装。`)
        }
        let Hook:PluginManager.ConstructorHook|PluginManager.FunctionHook=this.hooks.install
        if(!Hook && this.hooks['default']){
            Hook=this.hooks['default']
        }
        // @ts-ignore
        const res = Plugin.isConstructor(Hook)?new Hook(this,config):Hook(this,config)
        if(Plugin.isConstructor(Hook)){
            const name=res[Plugin.immediate]
            if (name) {
                this[name] = res
            }
        }
        try{
            if (res instanceof Promise)
                await res
            this.emit('ready')
        }catch (e){
            throw new PluginError(e.message)
        }
        this.parent?.emit('plugin-add',this)
        this.logger.info(`已安装插件(${this.pkg.name})${this.disableStatus!==true?',默认启用':''}`)
        return `已安装插件(${this.pkg.name})${this.disableStatus!==true?',默认启用':''}`
    }
    async enable(bot: Bot=null) {
        if(!bot && this.disableStatus){
            this.disableStatus=false
            this.parent?.emit('plugin-enable',this)
            this.logger.info(`已启用插件${this.pkg.name}`)
            return `已启用插件${this.pkg.name}`
        }
        if(this.disableStatus){
            throw new PluginError(`重复启用插件(${this.pkg.name})`)
        }
        if (this.binds.has(bot)) {
            throw new PluginError(`这个机器人实例已经启用了插件(${this.pkg.name})`)
        }
        await this._editBotPluginCache(bot, "add")
        this.binds.add(bot)
        this.parent?.emit('plugin-enable',this)
        this.logger.info(`已对Bot(${bot.uin})启用插件(${this.pkg.name})`)
        return `已对Bot(${bot.uin})启用插件(${this.pkg.name})`
    }

    async disable(bot: Bot=null) {
        if(!bot && !this.disableStatus){
            this.disableStatus=true
            this.parent?.emit('plugin-disable',this)
            return `已禁用插件${this.pkg.name}`
        }
        if(this.disableStatus){
            this.logger.info(`重复禁用`)
            return
        }
        if (!this.binds.has(bot)) {
            throw new PluginError(`这个机器人实例尚未启用插件(${this.pkg.name})`)
        }
        await this._editBotPluginCache(bot, "delete")
        this.binds.delete(bot)
        this.logger.info(`成功对机器人${bot.uin}禁用`)
        this.parent?.emit('plugin-disable',this)
        this.logger.info(`已对Bot(${bot.uin})禁用插件(${this.pkg.name})`)
        return `已对Bot(${bot.uin})禁用插件(${this.pkg.name})`
    }

    destroy(plugin:Plugin=this) {
        return plugin.dispose()
    }
    dispose(){
        while (this.disposes.length){
            this.disposes.shift()()
        }
        for(const child of this.children){
            child.dispose()
        }
        this.logger.info(`已卸载插件(${this.pkg.name})`)
        this.emit('dispose')
        this.parent?.emit('plugin-remove',this)
        return `已卸载插件(${this.pkg.name})`
    }
    async restart() {
        this.logger.info(`正在重新安装${this.pkg.name}...`)
        this.destroy()
        await this.install()
        return `已重启插件(${this.pkg.name})`
    }
    name(name:string){
        this.pkg.name=name
        return this
    }
    version(version:string){
        this.pkg.version=version
        return this
    }
    desc(desc:string){
        this.pkg.description=desc
        return this
    }
    repo(repoInfo:RepoInfo){
        this.pkg.repository=repoInfo
        return this
    }
    author(authorInfo:AuthorInfo){
        this.pkg.author=authorInfo
        return this
    }
    toJSON(){
        return {
            ...this.pkg,
            disabled:!!this.disableStatus
        }
    }
}
export namespace Plugin{
    export interface Services{
        pluginManager:PluginManager
        bots:BotList
    }
    export const Services: (keyof Services)[] = []
    export function isConstructor(func: Function) {
        // async function or arrow function
        if (!func.prototype) return false
        // generator function or malformed definition
        return func.prototype.constructor === func;

    }

    export function service<K extends keyof Services>(key: K) {
        if (Object.prototype.hasOwnProperty.call(Plugin.prototype, key)) return
        Services.push(key)
        const privateKey = Symbol(key)
        Object.defineProperty(Plugin.prototype, key, {
            get(this: Plugin) {
                const value:Services[K] = this.app[privateKey]
                if (!value) return
                return value
            },
            set(this: Plugin, value:Services[K]) {
                const oldValue:Services[K] = this.app[privateKey]
                if (oldValue === value) return
                this.app[privateKey] = value
                const action = value ? oldValue ? 'change' : 'load' : 'destroy'
                this.app.emit(`service.${action}`, key,value)
                this.logger.debug(key, action)
            },
        })
    }
    service('bots')
    service('pluginManager')
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
    async init(plugins:Record<string, boolean|Record<string, any>>) {
        for (const [name, conf] of Object.entries(plugins)) {
            try {
                await this.app.plugin(name,conf)
            } catch (e) {
                this.logger.warn(e.message)
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
        const plugin=new Plugin(resolved)
        plugin.name(name)
        return plugin
    }

    async install(plugin: Plugin, config?) {
        const result=await plugin.install(config)
        this.plugins.set(plugin.pkg.name||Math.random().toString(),plugin)
        return result
    }

    checkInstall(name: string) {
        if (!this.plugins.has(name)) {
            throw new PluginError(`尚未安装插件(${name})`)
        }
        return this.plugins.get(name)
    }

    async destroy(name: string) {
        const result=this.checkInstall(name).destroy()
        this.plugins.delete(name)
        return result
    }

    restart(name: string) {
        return this.checkInstall(name).restart()
    }

    enable(name: string, bot: Bot=null) {
        return this.checkInstall(name).enable(bot)
    }

    disable(name: string, bot: Bot=null) {
        return this.checkInstall(name).disable(bot)
    }

    async disableAll(bot: Bot) {
        const success:string[]=[],error:string[]=[]
        for (let [_, plugin] of this.plugins) {
            try{
                await plugin.disable(bot)
                success.push(plugin.pkg.name)
            }catch (e){
                error.push(`${plugin.pkg.name}:${e.message}`)
            }
        }
        return `调用成功，禁用成功${success.length}个插件\n禁用失败${error.length}个插件${error.length?`错误信息:\n${error.join('\n')}`:''}`
    }
    listAll(){
        const pluginList:Partial<PluginDesc>[]=[]
        const modulePath = path.join(process.cwd(), "node_modules")
        const orgPath = path.join(modulePath, '@oitq')
        // 列出的插件不展示内置插件
        const builtinPath = path.join(__dirname, 'plugins')
        const builtinPlugins = fs.readdirSync(builtinPath, {withFileTypes: true})
        for (let file of builtinPlugins) {
            if (file.isDirectory()) {
                try {
                    require.resolve(`${builtinPath}/${file.name}`)
                    let pkgInfo:Partial<PkgInfo>={}
                    try{
                        const pkg=require(path.join(`${builtinPath}/${file.name}`,'package.json'))
                        pkgInfo={
                            name:pkg.name,
                            author:pkg.author,
                            description:pkg.description,
                            repository:pkg.repository,
                            version:pkg.version
                        }
                    }catch {}
                    pluginList.push({
                        name: file.name,
                        type: PluginType.Builtin,
                        ...pkgInfo
                    })
                } catch {
                }
            } else if (file.isFile() && ((file.name.endsWith('.ts') && !file.name.endsWith('d.ts')) || file.name.endsWith('.js'))) {
                const fileName = file.name.replace(/\.ts|\.js/, '')
                try {
                    require.resolve(`${builtinPath}/${fileName}`)
                    pluginList.push({
                        name: fileName,
                        type: PluginType.Builtin,
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
                        let pkgInfo:Partial<PkgInfo>={}
                        try{
                            const pkg=require(path.join(`${builtinPath}/${file.name}`,'package.json'))
                            pkgInfo={
                                name:pkg.name,
                                author:pkg.author,
                                description:pkg.description,
                                repository:pkg.repository,
                                version:pkg.version
                            }
                        }catch {}
                        pluginList.push({
                            name: file.name,
                            type: PluginType.Custom,
                            ...pkgInfo
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
                    let pkgInfo:Partial<PkgInfo>={}
                    try{
                        const pkg=require(path.join(`${builtinPath}/${file.name}`,'package.json'))
                        pkgInfo={
                            name:pkg.name,
                            author:pkg.author,
                            description:pkg.description,
                            repository:pkg.repository,
                            version:pkg.version
                        }
                    }catch {}
                    pluginList.push({
                        name: file.name.replace('oitq-plugin-', ''),
                        type: PluginType.Community,
                        ...pkgInfo
                    })
                } catch {
                }
            }
        }
        if (fs.existsSync(orgPath)) {
            const orgModules = fs.readdirSync(orgPath, {withFileTypes: true})
            for (let file of orgModules) {
                if (file.isDirectory() && file.name.startsWith('plugin-md-')) {
                    try {
                        require.resolve(`@oitq/${file.name}`)
                        let pkgInfo:Partial<PkgInfo>={}
                        try{
                            const pkg=require(path.join(`${builtinPath}/${file.name}`,'package.json'))
                            pkgInfo={
                                name:pkg.name,
                                author:pkg.author,
                                description:pkg.description,
                                repository:pkg.repository,
                                version:pkg.version
                            }
                        }catch {}
                        pluginList.push({
                            name: file.name.replace('plugin-md-', ''),
                            type: PluginType.Official,
                            ...pkgInfo
                        })
                    } catch {
                    }
                }
            }
        }
        if(this.plugins.get('CLI')){
            pluginList.push({
                name:'CLI',
                type:PluginType.Official,
                ...this.plugins.get('CLI').pkg
            })
        }
        return pluginList.map(pluginDesc=>{
            const plugin=this.plugins.get(pluginDesc.name)
            return {
                ...pluginDesc,
                disabled:plugin && !!plugin.disableStatus,
                installed:this.plugins.has(pluginDesc.name)
            }
        })
    }
    list(name='app'): Partial<PluginDesc>[] {
        const pluginList=this.listAll()
        return (name==='app'?this.app.children:this.plugins.get(name)?this.plugins.get(name).children:[]).map(plugin => {
            const pluginDesc=pluginList.find(desc=>desc.name===plugin.pkg.name)||{}
            return {
                ...pluginDesc,
                ...plugin.pkg,
                disabled:!!plugin.disableStatus,
                installed:this.plugins.has(plugin.pkg.name)
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

    export type FunctionHook<T = any> = (parent: Plugin, options: T) => Awaitable<any>
    export type ConstructorHook<T = any> = new (parent: Plugin, options: T) => void
    export type PluginHook = FunctionHook | ObjectHook | ConstructorHook

    export interface ObjectHook<T = any> {
        install: FunctionHook<T>|ConstructorHook<T>
        name?:string
        using?: readonly (keyof Plugin.Services)[]
    }

    export type Option<T extends PluginHook> =
        T extends ConstructorHook<infer U> ? U
            : T extends FunctionHook<infer U> ? U
                : T extends ObjectHook<infer U> ? U
                    : never

    export interface Config {
        plugin_dir?: string,
        plugins?: Record<string, any>
    }
}

export abstract class Service {
    protected start(): Awaitable<void> {}
    protected stop(): Awaitable<void> {}

    constructor(protected plugin: Plugin, public name: keyof Plugin.Services,immediate?:boolean) {
        Plugin.service(name)
        if (immediate) {
            this[Plugin.immediate] = name
        }
        plugin.on('ready', async () => {
            await this.start()
            plugin[name] = this as never
        })

        plugin.on('dispose', async () => {
            if (plugin[name] === this as never) plugin[name] = null
            await this.stop()
        })

    }
    get caller(): Plugin {
        return this.plugin
    }
}
