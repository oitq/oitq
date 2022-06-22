import * as path from "path";
import * as fs from 'fs'
import {getLogger} from 'log4js'
import {App, Bot, Adapter, Middleware, NSession} from "./index";
import {AppEventMap,BeforeEventMap,Dispose} from './types'
import {Awaitable, createIfNotExist, readConfig, remove, writeConfig,unwrapExports} from "@oitq/utils";
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
    protected hooks: PluginManager.ObjectHook|PluginManager.ServiceHook
    public _using:readonly (keyof Plugin.Services)[]
    public parent:Plugin=null
    public children:Plugin[]=[]
    public disposes:Dispose[]=[]
    readonly binds = new Set<Bot>()
    disableStatus:boolean=false
    config
    pkg:Partial<PkgInfo>={}
    public pluginManager:PluginManager
    constructor(hooks: string | PluginManager.ObjectHook|PluginManager.ServiceHook,public type:'plugin'|'service'='plugin') {
        super()
        if (typeof hooks === 'string') {
            this.fullpath = require.resolve(hooks)
            require(hooks)
            const mod=unwrapExports(require.cache[this.fullpath].exports)
            this.path=this.fullpath
            this._using=mod.using||[]
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
        this.on(`${type}-add`,plugin=>{this.children.push(plugin)})
        this.on(`${type}-remove`,(plugin)=>remove(this.children,plugin))
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
    getLogger(category: string) {
        const logger=getLogger(category)
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
    setTimeout(callback:Function,ms:number,...args):Dispose{
        const timer=setTimeout(callback,ms,...args)
        const dispose=()=>{clearTimeout(timer);return true}
        this.disposes.push(dispose)
        return dispose
    }
    setInterval(callback:Function,ms:number,...args):Dispose{
        const timer=setInterval(callback,ms,...args)
        const dispose=()=>{clearInterval(timer);return true}
        this.disposes.push(dispose)
        return dispose
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
    static validate(config: any) {
        if (config === false) return
        if (config === true) config = undefined
        return config
    }
    service(name:string,config?:any):this
    service<T extends PluginManager.ServiceHook>(service:T,config?:PluginManager.Option<T>):this
    service(entry:string|PluginManager.ServiceHook,config:any):this{
        let plugin:Plugin
        if(typeof entry==='string') plugin=this.app.pluginManager.import(entry,'service')
        else plugin=new Plugin(entry,'service')
        plugin.parent=this
        plugin.app=this.app
        const using = plugin['_using'] || []
        plugin.logger=this.getLogger(`[service:${plugin.pkg.name}]`)
        if (using.length) {
            this.app.on('service.load', async (name) => {
                if (!using.includes(name)) return
                await callback()
            })
        }
        const callback = async () => {
            if (using.some(n => !this[n])) return
            await this.app.pluginManager.install(plugin,Plugin.validate(config)).catch(e=>{
                this.logger.warn(`安装${plugin.pkg.name}时遇到错误，错误信息：${e.message}:${e.stack}`)
            })
        }
        callback()
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
            await this.app.pluginManager.install(plugin,Plugin.validate(config)).catch(e=>{
                this.logger.warn(`安装${plugin.pkg.name}时遇到错误，错误信息：${e.message}:${e.stack}`)
            })
        }
        callback()
        return this
    }
    command<D extends string>(def: D,triggerEvent:keyof EventMap): Command<Action.ArgumentType<D>> {
        const namePath = def.split(' ', 1)[0]
        const decl = def.slice(namePath.length)
        const segments = namePath.split(/(?=[/])/g)

        let parent: Command, nameArr=[]
        while (segments.length){
            const segment=segments.shift()
            const code = segment.charCodeAt(0)
            const tempName = code === 47 ? segment.slice(1) : segment
            nameArr.push(tempName)
            if(segments.length)parent=this.app.commandList.find(cmd=>cmd.name===tempName)
            if(!parent && segments.length) throw Error(`cannot find parent command:${nameArr.join('.')}`)
        }
        const name=nameArr.pop()
        const command = new Command(name+decl,this,triggerEvent)
        if(parent){
            command.parent=parent
            parent.children.push(command)
        }
        this.app._commands.set(name,command)
        this.app.commandList.push(command)
        this.disposes.push(()=>{
            remove(this.app.commandList,command)
            this.app._commands.delete(name)
            this.app.emit('command-remove',command)
            return true
        })
        this.app.emit('command-add',command)
        return command as any
    }
    async execute(session:NSession,content=session.cqCode||''):Promise<boolean|Sendable|void> {
        const argv = Action.parse(content)
        argv.bot = session.bot
        argv.session = session
        const command=this.findCommand(argv)
        if(command){
            let result
            if (result) return result
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
    async install(config?: any) {
        if(config)this.config=config
        else config=this.config
        if (this.path) {
            require(this.path)
            this.hooks = unwrapExports(require.cache[this.fullpath].exports)
            this._using=this.hooks.using||[]
        }
        if (typeof this.hooks['install'] !== "function" && typeof this.hooks !== "function") {
            throw new PluginError(`插件(${this.pkg.name})未导出install方法，无法安装。`)
        }
        let Hook:PluginManager.ConstructorHook|PluginManager.FunctionHook=this.hooks['install']
        if(!Hook){
            Hook=this.hooks as PluginManager.ConstructorHook
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
        this.parent.emit(`${this.type}-add`,this)
        this.log(`已安装${this.type}(${this.pkg.name})${this.disableStatus!==true && this.type==='plugin'?',默认启用':''}`)
        return `已安装${this.type}(${this.pkg.name})${this.disableStatus!==true && this.type==='plugin'?',默认启用':''}`
    }
    private log(str:string,force?:boolean){
        if(this.parent===this.app || force){
            this.parent.logger.info(str)
        }
    }
    async enable(bot: Bot=null) {
        if(!bot && this.disableStatus){
            this.disableStatus=false
            this.parent.emit(`${this.type}-enable`,this)
            this.log(`已启用${this.type}${this.pkg.name}`)
            return `已启用${this.type}${this.pkg.name}`
        }
        if(this.disableStatus){
            throw new PluginError(`重复启用${this.type}(${this.pkg.name})`)
        }
        if (this.binds.has(bot)) {
            throw new PluginError(`这个机器人实例已经启用了${this.type}(${this.pkg.name})`)
        }
        this.binds.add(bot)
        this.parent.emit(`${this.type}-enable`,this)
        this.log(`已对Bot(${bot.sid})启用${this.type}(${this.pkg.name})`)
        return `已对Bot(${bot.sid})启用${this.type}(${this.pkg.name})`
    }

    async disable(bot: Bot=null) {
        if(!bot && !this.disableStatus){
            this.disableStatus=true
            this.parent.emit(`${this.type}-disable`,this)
            return `已禁用${this.type}${this.pkg.name}`
        }
        if(this.disableStatus){
            this.logger.info(`重复禁用`)
            return
        }
        if (!this.binds.has(bot)) {
            throw new PluginError(`这个机器人实例尚未启用${this.type}(${this.pkg.name})`)
        }
        this.binds.delete(bot)
        this.parent.emit(`${this.type}-disable`,this)
        this.log(`已对Bot(${bot.sid})禁用${this.type}(${this.pkg.name})`)
        return `已对Bot(${bot.sid})禁用${this.type}(${this.pkg.name})`
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
        this.emit('dispose')
        this.parent.emit(`${this.type}-remove`,this)
        this.log(`已卸载插件(${this.pkg.name})`)
        return `已卸载${this.type}(${this.pkg.name})`
    }
    async restart() {
        this.log(`正在重启${this.pkg.name}...`)
        this.destroy()
        await this.install()
        return `已重启${this.type}(${this.pkg.name})`
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
        bots:Adapter.BotList
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
    public plugin_dir:string
    public service_dir:string
    public plugins: Map<string, Plugin> = new Map<string, Plugin>()
    constructor(public app: App) {
        this.plugin_dir=app.config.plugin_dir
        this.service_dir=app.config.service_dir
    }
    get logger(){
        return this.getLogger('pluginManager')
    }
    getLogger(category:string){
        return this.app.getLogger(category)
    }
    async init() {
        // init services
        for (const [name, conf] of Object.entries(this.app.config.services||{})) {
            try {
                await this.app.service(name,conf)
            } catch (e) {
                this.logger.warn(e.message)
            }
        }
        // init plugins
        for (const [name, conf] of Object.entries(this.app.config.plugins||{})) {
            try {
                await this.app.plugin(name,conf)
            } catch (e) {
                this.logger.warn(e.message)
            }
        }
    }
    import(name: string,type:'service'|'plugin'='plugin') {
        if (this.plugins.has(name))
            return this.plugins.get(name)
        let resolved = ""
        // 查找内置插件
        try{
            require.resolve(path.join(__dirname,`plugins/${name}`))
            resolved=`${__dirname}/plugins/${name}`
        }catch {}
        if(!resolved){
            if(fs.existsSync(this.plugin_dir) && type==='plugin'){
                try {
                    require.resolve(`${this.plugin_dir}/${name}`)
                    resolved = `${this.plugin_dir}/${name}`
                } catch {
                }
            }else if(fs.existsSync(this.service_dir) && type==='service'){
                try {
                    require.resolve(`${this.plugin_dir}/${name}`)
                    resolved = `${this.plugin_dir}/${name}`
                } catch {
                }
            }
        }
        if(!resolved){//尝试在全局包里面查找官方插件
            try {
                require.resolve(`@oitq/${type}-${name}`);
                resolved = `@oitq/${type}-${name}`;
            }catch {}
        }
        if(!resolved){//尝试在全局包里面查找社区插件
            try {
                require.resolve(`oitq-${type}-${name}`);
                resolved = `oitq-${type}-${name}`;
            }catch {}
        }
        if (!resolved)
            throw new PluginError(`插件名错误，无法找到插件(${name})`)
        const plugin=new Plugin(resolved,type)
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
            throw new PluginError(`尚未安装(${name})`)
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
    listAll(){
        const pluginList:Partial<PluginDesc>[]=[]
        const modulePath = path.join(process.cwd(), "node_modules")
        const orgPath = path.join(modulePath, '@oitq')
        if (fs.existsSync(this.plugin_dir)) {
            const customPlugins = fs.readdirSync(this.plugin_dir, {withFileTypes: true})
            for (let file of customPlugins) {
                if (file.isDirectory() || file.isSymbolicLink()) {
                    try {
                        require.resolve(`${this.plugin_dir}/${file.name}`)
                        let pkgInfo:Partial<PkgInfo>={}
                        try{
                            const pkg=require(path.join(`${this.plugin_dir}/${file.name}`,'package.json'))
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
            if (file.isDirectory() && (file.name.startsWith("oitq-plugin-") || file.name.startsWith("oitq-service-"))) {
                try {
                    require.resolve(file.name)
                    let pkgInfo:Partial<PkgInfo>={}
                    try{
                        const pkg=require(path.join(file.name,'package.json'))
                        pkgInfo={
                            name:pkg.name,
                            author:pkg.author,
                            description:pkg.description,
                            repository:pkg.repository,
                            version:pkg.version
                        }
                    }catch {}
                    pluginList.push({
                        name: file.name.replace('oitq-plugin-', '').replace('oitq-service-',''),
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
                if (file.isDirectory() && (file.name.startsWith('plugin-') || file.name.startsWith('service-'))) {
                    try {
                        require.resolve(`@oitq/${file.name}`)
                        let pkgInfo:Partial<PkgInfo>={}
                        try{
                            const pkg=require(path.join(file.name,'package.json'))
                            pkgInfo={
                                name:pkg.name,
                                author:pkg.author,
                                description:pkg.description,
                                repository:pkg.repository,
                                version:pkg.version
                            }
                        }catch {}
                        pluginList.push({
                            name: file.name.replace('plugin-', '').replace('service-',''),
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
        createIfNotExist(path.join(bot.sid, 'plugin'), [])
        const dir = path.join(bot.sid, "plugin")
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
    export type ConstructorHook<T = any> =( new (parent: Plugin, options: T) => void) & {
        using?:readonly (keyof Plugin.Services)[]
    }
    export type PluginHook = FunctionHook | ObjectHook | ConstructorHook
    export type ServiceHook=ConstructorHook
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
        plugin_dir?: string
        service_dir?:string
        services?:Record<string, any>
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
            if (plugin[name] === this as never) { // @ts-ignore
                plugin[name] = null
            }
            await this.stop()
        })

    }
    get caller(): Plugin {
        return this.plugin
    }
}
