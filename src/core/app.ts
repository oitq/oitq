import Koa from 'koa'
import {Server,createServer} from 'http'
import {Router} from "./router";
import * as KoaBodyParser from 'koa-bodyparser'
import {Bot, BotEventMap, BotList, BotOptions} from "./bot";
import {success,error,sleep,merge} from "@/utils/functions";
import {defaultOneBotConfig} from "@/onebot/config";
import {OneBot} from "@/onebot";
import {Dict} from "@/utils/types";
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
    bots:[],
    admins:[],
    token:'',
    delay:{
        prompt:60000
    }
}
export interface AppOptions extends KoaOptions{
    start?:boolean,
    path?:string
    bots?:BotOptions[]
    delay?:Dict<number>
    admins?:number[]
    token?:string
}
export interface AppEventMap extends BotEventMap{
    'ready'():void
    'dispose'():void

}
export interface App extends Koa{
    constructor(options?:AppOptions):App
    addBot(options:BotOptions):Bot
    removeBot(uin:number):void
    on<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E]):this;
    on<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void):this;
    once<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E]):this;
    once<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void):this;
    addEventListener<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E]):this;
    addEventListener<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void):this;
    emit<E extends keyof AppEventMap>(name:E,...args:Parameters<AppEventMap[E]>):boolean
    emit<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,...args:any[]):boolean
}
export class App extends Koa{
    status:boolean=false
    public bots:BotList=new BotList(this)
    public router:Router
    readonly httpServer:Server
    options:AppOptions
    constructor(options:AppOptions={}) {
        super(options);
        this.options=merge(defaultAppOptions,options)
        this.router=new Router({prefix:this.options.path})
        this.use(KoaBodyParser())
        this.use(this.router.routes())
        this.use(this.router.allowedMethods())
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
        if(options.bots){
            for(const botOptions of options.bots){
                this.addBot(botOptions)
            }
        }
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
            await sleep(3000)//避免同一设备同时多个bot登录异常，做延时
        }
        this.on('message',()=>{

        })
        this.status=true
    }
    listen(...args){
        const server=this.httpServer.listen(...args);
        this.emit('listen',...args)
        return server
    }
}
