import {Bot, BotEventMap, BotList, NSession} from "./bot";
import {App} from "./app";
import {Plugin, PluginManager} from "./plugin";
import {Argv, Command} from "@lc-cn/command";
import {getLogger} from 'log4js'
import {Awaitable, makeArray, MaybeArray, remove} from "@oitq/utils";
import {Events} from "./event";
import {Middleware} from "./middleware";
const selectors = ['user', 'group',  'self', 'private'] as const
export type SelectorType = typeof selectors[number]
export type SelectorValue = boolean | MaybeArray<number>
export type BaseSelection = { [K in SelectorType as `$${K}`]?: SelectorValue }
export interface Selection extends BaseSelection {
    $and?: Selection[]
    $or?: Selection[]
    $not?: Selection
}
export type Filter = (session:NSession<'message'>) => boolean

type EventName = keyof AppEventMap
type ServiceAction="load"|'change'|'destroy'|'enable'|'disable'
type ServiceListener<K extends keyof Context.Services = keyof Context.Services>=(key:K,service:Context.Services[K])=>void
type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never
type ServiceEventMap = {
    [P in ServiceAction as `service.${P}`]: ServiceListener;
};

export type BeforeEventMap = { [E in EventName & string as OmitSubstring<E, 'before-'>]: AppEventMap[E] }
export interface AppEventMap extends BotEventMap,ServiceEventMap{
    'ready'():void
    'dispose'():void
    'command/before-execute'(argv: Argv): Awaitable<void | string>
    'before-parse'(content: string, session: NSession<'message'>): void
    'before-attach'(session: NSession<'message'>): void
    'attach'(session: NSession<'message'>): void
    'bot-added'(bot: Bot): void
    'bot-removed'(bot: Bot): void
    'plugin-added'(plugin: Plugin): void
    'plugin-removed'(plugin: Plugin): void

    'before-command'(argv: Argv): Awaitable<void | string>
    'help/command'(output: string[], command: Command, session: NSession<'message'>): void
    'help/option'(output: string, option: Argv.OptionDeclaration, command: Command, session: NSession<'message'>): string

}
export type Dispose=()=>boolean
export interface Context extends Context.Services{
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
export class Context extends Events{
    constructor(public filter:Filter,public app?:App,public _plugin: Plugin = null) {
        super();
    }
    logger(name: string) {
        const logger=getLogger(name)
        logger.level=this.app.options.logLevel
        return logger
    }
    get state(){
        return this.app.disposeState.get(this._plugin)
    }
    override on<K extends EventName>(name: K, listener: (...args: any[]) => void, prepend?: boolean): () => boolean {
        const dispose=super.on(name, listener, prepend);
        this.state.disposes.push(dispose)
        return dispose
    }

    intersect(arg: Filter | Context) {
        const filter = typeof arg === 'function' ? arg : arg.filter
        return new Context(s => this.filter(s) && filter(s), this.app)
    }
    private _property<K extends keyof NSession<'message'>>(key: K, ...values: NSession<'message'>[K][]) {
        return this.intersect((session) => {
            return values.length ? values.includes(session[key]) : !!session[key]
        })
    }
    exclude(arg: Filter | Context) {
        const filter = typeof arg === 'function' ? arg : arg.filter
        return new Context(s => this.filter(s) && !filter(s), this.app)
    }
    any() {
        return new Context(() => true, this.app)
    }

    never() {
        return new Context(() => false, this.app)
    }
    union(arg: Filter | Context) {
        const filter = typeof arg === 'function' ? arg : arg.filter
        return new Context(s => this.filter(s) || filter(s), this.app)
    }
    user(...values: number[]) {
        return this._property('user_id', ...values)
    }

    group(...values: number[]) {
        return this._property('group_id', ...values)
    }
    private(...values: number[]) {
        return this.exclude(this._property('group_id'))._property('user_id', ...values)
    }
    select(options: Selection) {
        let ctx: Context = this

        // basic selectors
        for (const type of selectors) {
            const value = options[`$${type}`] as SelectorValue
            if (value === true) {
                ctx = ctx[type]()
            } else if (value === false) {
                ctx = ctx.exclude(ctx[type]())
            } else if (value !== undefined) {
                // we turn everything into string
                ctx = ctx[type](...makeArray(value))
            }
        }

        // intersect
        if (options.$and) {
            for (const selection of options.$and) {
                ctx = ctx.intersect(this.select(selection))
            }
        }

        // union
        if (options.$or) {
            let ctx2: Context = this.app
            for (const selection of options.$or) {
                ctx2 = ctx2.union(this.select(selection))
            }
            ctx = ctx.intersect(ctx2)
        }

        // exclude
        if (options.$not) {
            ctx = ctx.exclude(this.select(options.$not))
        }

        return ctx
    }
    match(session?: NSession<'message'>) {
        return !session || this.filter(session)
    }
    using<T extends PluginManager.Plugin>(using: readonly (keyof Context.Services)[], plugin:T,config?:PluginManager.Option<T>) {
        if(typeof plugin==='function'){
            plugin={install:plugin,name:plugin.name} as T
        }
        return this.plugin({ using,...plugin},config)
    }
    dispose(plugin:Plugin=this._plugin){
        const state=this.app.disposeState.get(plugin)
        for(const ctx of state.children){
            ctx.dispose()
        }
        for(const dispose of state.disposes){
            dispose()
        }
    }
    middleware(middleware:Middleware):Dispose{
        const disposeArr:Dispose[]=[]
        for(const bot of this.bots){
            disposeArr.push(bot.middleware(middleware))
        }
        this.on('bot.add',(bot)=>{
            disposeArr.push(bot.middleware(middleware))
        })
        const dispose=()=>{
            disposeArr.forEach(dispose=>dispose())
            return true
        }
        return dispose
    }
    plugin(name:string,config?:any):this
    plugin<T extends PluginManager.Plugin>(plugin:T,config?:PluginManager.Option<T>):this
    plugin(entry: string | Plugin|PluginManager.Plugin, config?: any):this{
        let plugin:Plugin
        if(typeof entry==='string')plugin=this.pluginManager.import(entry)
        else if(entry instanceof Plugin)plugin=entry
        else{
            if(typeof entry==='function')entry={install:entry,name:config?.name||entry?.name||Math.random().toString()}
            plugin=new Plugin(entry?.name||Math.random().toString(),entry)
        }
        const context=new Context(this.filter,this.app,plugin)
        plugin.bindCtx(context)
        this.app.disposeState.set(plugin,{
            plugin,
            context,
            children:[],
            disposes:[]
        })
        this.state.children.push(context)
        const using = plugin['using'] || []
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
    command<D extends string>(def: D, config?: Command.Config): Command<Argv.ArgumentType<D>>
    command<D extends string>(def: D, desc: string, config?: Command.Config): Command<Argv.ArgumentType<D>>
    command(def: string, ...args: [Command.Config?] | [string, Command.Config?]) {
        const desc = typeof args[0] === 'string' ? args.shift() as string : ''
        const config = args[0] as Command.Config
        const path = def.split(' ', 1)[0]
        const decl = def.slice(path.length)
        const segments = path.split(/(?=[./])/g)

        let parent: Command, root: Command
        segments.forEach((segment, index) => {
            const code = segment.charCodeAt(0)
            const name = code === 46 ? parent.name + segment : code === 47 ? segment.slice(1) : segment
            let command = this.app._commands.get(name)
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
            command = new Command(name, decl, index === segments.length - 1 ? desc : '')
            command.config=config||{}
            command.context=this
            this.app._commands.set(name,command)
            this.app._commandList.push(command)
            this.state.disposes.push(()=>remove(this.app._commandList,command),()=>{
                this.app._commands.delete(name)
                return true
            })
            this.emit('command.add',command)
            if (!root) root = command
            if (parent) {
                command.parent = parent
                command.config.authority = parent.config.authority
                parent.children.push(command)
            }
            parent = command
        })

        if (desc) parent.description = desc
        Object.assign(parent.config||={}, config)
        if (!config?.patch) {
            return parent
        }
        return Object.create(parent)
    }
}
export namespace Context{

    export interface Services{
        pluginManager:PluginManager
        bots:BotList
    }
    export function service<K extends keyof Services>(key: K) {
        if (Object.prototype.hasOwnProperty.call(Context.prototype, key)) return
        const privateKey = Symbol(key)
        Object.defineProperty(Context.prototype, key, {
            get(this: Context) {
                const value:Services[K] = this.app[privateKey]
                if (!value) return
                return value
            },
            set(this: Context, value:Services[K]) {
                const oldValue:Services[K] = this.app[privateKey]
                if (oldValue === value) return
                this.app[privateKey] = value
                const action = value ? oldValue ? 'change' : 'load' : 'destroy'
                this.emit(`service.${action}`, key,value)
                this.logger('service').debug(key, action)
            },
        })
    }
}
Context.service('bots')
Context.service('pluginManager')
