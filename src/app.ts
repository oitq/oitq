import Koa from 'koa'
import {Server,createServer} from 'http'
import {Router} from "./router";
import {Bot, BotList, BotOptions} from "./bot";
import {success,error,sleep,merge} from "./utils";
import Socket = require('ws')
import {Middleware} from "@koa/router";
export interface AppOptions{
    env?: string | undefined,
    keys?: string[] | undefined,
    proxy?: boolean | undefined,
    subdomainOffset?: number | undefined,
    proxyIpHeader?: string | undefined,
    maxIpsCount?: number | undefined
    path?:string
    bots?:BotOptions[]
}
export interface App extends Koa{
    constructor(options?:AppOptions):App
    addBot(options:BotOptions):Bot
    removeBot(uin:number):void
}
export const defaultAppOptions={
    path:'',
    bots:[],
}
export class App extends Koa{
    public bots:BotList=new BotList()
    public router:Router=new Router()
    private wsServer:Socket.Server
    private httpServer:Server
    private options:AppOptions
    constructor(options:AppOptions={}) {
        super();
        this.options=merge(defaultAppOptions,options)
        this.router.get(options.path||'',(ctx)=>{
            ctx.body='this is oicq-bots api\n' +
                'use post request to visit `/${uin}/method` to apply bot method,post data will used by method params\n' +
                'use websocket to connect `/uin` to listen bot request/notice'
        })
        this.router.post('/add',async (ctx)=>{
            ctx.body=success(await this.addBot(ctx.body))
        })
        this.router.get('/remove',async (ctx)=>{
            const {uin}=ctx.query
            if(!uin) ctx.body=error('请输入uin')
            await this.removeBot(Number(uin))
            return success('移除成功')
        })
        if(options.bots){
            for(const botOptions of options.bots){
                this.addBot(botOptions)
            }
        }
        this.use(require('koa-bodyparser')())
        this.use(this.router.routes())
        this.use(this.router.allowedMethods())
        this.httpServer=createServer(this.callback())
        this.wsServer = new Socket.Server({
            server: this.httpServer,
        })
        this.wsServer.on('connection',((socket, request) => {
            for (const manager of this.router.wsStack) {
                manager.accept(socket, request)
            }
        }))
    }
    addBot(options:BotOptions){
        this.options.bots.push(options)
        const bot=this.bots.create(options)
        if(options.use_ws){
            this.router.ws(`${this.options.path}/${options.uin}`,((socket, request) => {
                if(options.enable_heartbeat){
                    setInterval(()=>{
                        const json = JSON.stringify({
                            uin: options.uin,
                            time: parseInt(String(Date.now() / 1000)),
                            post_type: "meta_event",
                            meta_event_type: "heartbeat",
                            interval: options.heartbeat_interval,
                        })
                        socket.send(json)
                    }, options.heartbeat_interval||3000);
                }
            }))
        }
        this.addRoute(`${this.options.path}/${options.uin}/:method`,async (ctx)=>{
            const {method}=ctx.params
            const params={...ctx.query,...ctx.body,...ctx.params}
            if(!Array.isArray(params.args)){
                try{
                    params.args=eval(params.args)
                }catch {}
            }
            if(options.access_token && ctx.headers['authorization']!==options.access_token)return ctx.status=401
            if(!bot[method]) return error('未知方法')
            try{
                ctx.body=success(await bot[method](...params.args||[]))
            }catch (e){
                ctx.body=error(e.message)
            }
        })
        bot.on('sync',(data)=>{
            for(const socket of this.wsServer.clients){
                socket.send(JSON.stringify(data))
            }
        })
        bot.on('message',(data)=>{
            for(const socket of this.wsServer.clients){
                socket.send(JSON.stringify(data))
            }
        })
        bot.on('notice',(data)=>{
            for(const socket of this.wsServer.clients){
                socket.send(JSON.stringify(data))
            }
        })
        bot.on('request',(data)=>{
            for(const socket of this.wsServer.clients){
                socket.send(JSON.stringify(data))
            }
        })
        bot.on('system',(data)=>{
            for(const socket of this.wsServer.clients){
                socket.send(JSON.stringify(data))
            }
        })
        return bot
    }
    async removeBot(uin:number){
        this.addRoute(`${this.options.path}/${uin}/:method`,(ctx)=>{
            ctx.body=error(`bot:${uin} has removed`)
        })
        return await this.bots.remove(uin)
    }
    private addRoute(path:string|RegExp|(string|RegExp)[],callback:Middleware){
        this.router.get(path,callback)
        this.router.post(path,callback)
    }
    private async start(){
        for(const bot of this.bots){
            const botOptions=this.options.bots||=[]
            const option:BotOptions=botOptions.find(botOption=>botOption.uin===bot.uin) ||{} as any
            await bot.login(option.password)
            await sleep(3000)//避免同一设备同时多个bot登录异常，做延时
        }
    }
    listen(...args){
        this.start()
        return this.httpServer.listen(...args,()=>{
            console.log('app is listen at http://127.0.0.1:'+args[0])
        });
    }
}