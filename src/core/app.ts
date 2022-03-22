import Koa from 'koa'
import {Server,createServer} from 'http'
import {Router} from "./router";
import * as KoaBodyParser from 'koa-bodyparser'
import {Bot, BotEventMap, BotList, BotOptions, NSession} from "./bot";
import {success, error, sleep, merge} from "@/utils/functions";
import {defaultOneBotConfig} from "@/onebot/config";
import {OneBot} from "@/onebot";
import {Awaitable, Dict} from "@/utils/types";
import {PluginManager, Plugin, Computed} from "@/core";
import * as path from "path";
import {Command,Argv} from "@lc-cn/command";

interface KoaOptions{
    port?:number,
    env?: string
    keys?: string[]
    proxy?: boolean
    subdomainOffset?: number
    proxyIpHeader?: string
    maxIpsCount?: number
}

export const defaultAppOptions={
    port:8080,
    path:'',
    prefix:()=>'',
    bots:[],
    admins:[],
    plugins:[],
    minSimilarity:0.4,
    token:'',
    plugin_dir:path.join(process.cwd(),'plugins'),
    delay:{
        prompt:60000
    }
}
export interface AppOptions extends KoaOptions,PluginManager.Config{
    start?:boolean,
    prefix?: Computed<string | string[]>
    minSimilarity?:number,
    path?:string
    bots?:BotOptions[]
    delay?:Dict<number>
    admins?:number[]
    token?:string
}

type EventName = keyof AppEventMap
type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never
type BeforeEventName = OmitSubstring<EventName & string, 'before-'>

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
interface CommandMap extends Map<string, Command> {
    resolve(key: string): Command
}

export interface App extends Koa{
    constructor(options?:AppOptions):App
    addBot(options:BotOptions):Bot
    removeBot(uin:number):void
    on<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):this;
    on<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):this;
    once<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):this;
    once<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):this;
    addEventListener<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):this;
    addEventListener<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):this;
    emit<E extends keyof AppEventMap>(name:E,...args:Parameters<AppEventMap[E]>):boolean
    emit<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,...args:any[]):boolean
}
export class App extends Koa{
    status:boolean=false
    _commandList: Command[] = []
    _commands: CommandMap = new Map<string, Command>() as never
    _shortcuts: Command.Shortcut[] = []
    public bots:BotList=new BotList(this)
    public pluginManager:PluginManager
    public router:Router
    readonly httpServer:Server
    options:AppOptions
    constructor(options:AppOptions={}) {
        super(options);
        this.options=merge(defaultAppOptions,options)
        this.pluginManager=new PluginManager(this,this.options)
        this.router=new Router({prefix:this.options.path})
        this.use(KoaBodyParser())
            .use(this.router.routes())
            .use(this.router.allowedMethods())
        this.httpServer=createServer(this.callback())
        this.router.get('',(ctx)=>{
            ctx.body='this is oicq-bots api\n' +
                'use post request to visit `/${uin}/method` to apply bot method,post data will used by method params\n' +
                'use websocket to connect `/uin` to listen bot request/notice'
        })
        this.router.post('/add',async (ctx,next)=>{
            if(!ctx.body || Object.keys(ctx.body).length==0) return ctx.body=error('请输入完整bot配置，具体配置见github（BotOptions）')
            // await this.addBot(ctx.body)
            ctx.body=success('添加成功')
            await next()
        })
        this.router.get('/remove',async (ctx,next)=>{
            const {uin}=ctx.query
            if(!uin) ctx.body=error('请输入uin')
            await this.removeBot(Number(uin))
            await next()
            return success('移除成功')
        })
        this._commands.resolve = (key) => {
            if (!key) return
            const segments = key.split('.')
            let i = 1, name = segments[0], cmd: Command
            while ((cmd = this.getCommand(name)) && i < segments.length) {
                name = cmd.name + '.' + segments[i++]
            }
            return cmd
        }
        if(options.bots){
            for(const botOptions of options.bots){
                this.addBot(botOptions)
            }
        }
    }

    getCommand(name: string) {
        return this._commands.get(name)
    }
    plugin(name:string,plugin?:Plugin|PluginManager.Object,config?){
        if(!plugin)plugin=this.pluginManager.import(name)
        if(!(plugin instanceof Plugin)){
            plugin=new Plugin(name,plugin)
        }
        this.pluginManager.install(name,plugin as Plugin,config)
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
            command = new Command(name, decl, index === segments.length - 1 ? desc : '')
            command.config=config||{}
            command.app=this
            this._commands.set(name,command)
            this._commandList.push(command)
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
    addBot(options:BotOptions){
        this.options.bots.push(options)
        const bot=this.bots.create(options)
        if(options.oneBot){
            bot.oneBot=new OneBot(this,bot,typeof options.oneBot==='boolean'?defaultOneBotConfig:options.oneBot)
        }
        if(this.status) {
            bot.once('system.online',()=>{
                bot.oneBot?.start()
            })
            bot.login(options.password)
        }
        return bot
    }
    async removeBot(uin:number){
        const bot=this.bots.get(uin)
        if(bot && bot.oneBot){
            await bot.oneBot.stop()
        }
        return await this.bots.remove(uin)
    }
    async start(port=this.options.port){
        this.listen(port,()=>{
            console.log('app is listen at http://127.0.0.1:'+port)
        })
        for(const bot of this.bots){
            const botOptions=this.options.bots||=[]
            const option:BotOptions=botOptions.find(botOption=>botOption.uin===bot.uin) ||{} as any
            await bot.login(option.password)
            await bot.oneBot?.start()
            await this.pluginManager.restore(bot)
            await sleep(3000)//避免同一设备同时多个bot登录异常，做延时
        }
        this.status=true
    }
    listen(...args){
        const server=this.httpServer.listen(...args);
        this.emit('listen',...args)
        return server
    }
}
