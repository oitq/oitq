import {Bot, BotEventMap, BotList, NSession} from "./bot";
import {App} from "./app";
import {Plugin, PluginManager} from "./plugin";
import {Argv, Command} from "@lc-cn/command";
import {getLogger} from 'log4js'
import {Awaitable, makeArray, MaybeArray} from "@oitq/utils";
import {Events} from "./event";
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
type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never

export type BeforeEventMap = { [E in EventName & string as OmitSubstring<E, 'before-'>]: AppEventMap[E] }
export interface AppEventMap extends BotEventMap{
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
export interface Services{
    pluginManager:PluginManager
    bots:BotList
}
export interface Context extends Services{
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
    constructor(public filter:Filter,public app?:App) {
        super();
    }
    logger(name: string) {
        const logger=getLogger(name)
        logger.level=this.app.options.logLevel
        return logger
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
    plugin(name:string,plugin?:Plugin|PluginManager.Object|PluginManager.Object['install'],config?){
        if(!plugin)plugin=this.app.pluginManager.import(name)
        if(typeof plugin==='function'){
            if(!(plugin instanceof Plugin)){
                plugin=new Plugin(name, {install:plugin})
            }
        }else{
            plugin=new Plugin(name,plugin)
        }
        this.app.pluginManager.install(plugin as Plugin,config)
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
