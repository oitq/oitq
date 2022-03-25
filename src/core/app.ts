import Koa from 'koa'
import {Server,createServer} from 'http'
import {Router} from "./router";
import KoaBodyParser from 'koa-bodyparser'
import {BotList, BotOptions} from "./bot";
import {success, error, sleep, merge} from "@/utils/functions";
import {defaultOneBotConfig} from "@/onebot/config";
import {OneBot} from "@/onebot";
import { Dict} from "@/utils/types";
import {PluginManager} from "@/core";
import * as path from "path";
import {Command} from "@lc-cn/command";
import {Context} from "@/core/context";
import {LogLevel} from "oicq";

interface KoaOptions{
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
    bots:[],
    admins:[],
    maxListeners:50,
    plugins:[],
    logLevel:'debug',
    plugin_dir:path.join(process.cwd(),'plugins'),
    delay:{
        prompt:60000
    }
}
export interface AppOptions extends KoaOptions,PluginManager.Config{
    port?:number,
    start?:boolean,
    path?:string
    bots?:BotOptions[]
    delay?:Dict<number>
    admins?:number[]
    logLevel?:LogLevel
    maxListeners?:number,
}


interface CommandMap extends Map<string, Command> {
    resolve(key: string): Command
}

export class App extends Context{
    status:boolean=false
    _commandList: Command[] = []
    _commands: CommandMap = new Map<string, Command>() as never
    _shortcuts: Command.Shortcut[] = []
    public bots:BotList=new BotList(this)
    public pluginManager:PluginManager
    private koa:Koa
    public router:Router
    public app:App=this
    readonly httpServer:Server
    options:AppOptions
    constructor(options:AppOptions={}) {
        super(()=>true);
        this.options=merge(defaultAppOptions,options)
        this.koa=new Koa(options)
        this.pluginManager=new PluginManager(this,this.options)
        this.router=new Router({prefix:this.options.path})
        this.koa.use(KoaBodyParser())
            .use(this.router.routes())
            .use(this.router.allowedMethods())
        this.httpServer=createServer(this.koa.callback())
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
