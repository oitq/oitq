import Koa from 'koa'
import {App,Context} from '@oitq/core'
import {success,error,merge} from '@oitq/utils'
import {OneBot, OneBotConfig,defaultOneBotConfig} from "./onebot";
import {Router} from "./router";
import KoaBodyParser from "koa-bodyparser";
import {createServer, Server} from "http";
import * as path from "path";
export function getAppConfigPath(dir=process.cwd()){return path.join(dir,'oitq.json')}
export function getOneBotConfigPath(dir=process.cwd()){return path.join(dir,'oneBot.json')}
export function getBotConfigPath(dir=process.cwd()){return path.join(dir,'bot.json')}
declare module '@oitq/core'{
    interface Services{
        koa:Koa
        router:Router
        readonly httpServer:Server
    }
    interface AppOptions{
        port?:number,
        path?:string
    }
    interface Bot{
        oneBot:OneBot
    }
    interface BotOptions{
        oneBot?:boolean|OneBotConfig
    }
}
const oldPrepare=App.prototype.prepare
export * from './onebot'
export * from './router'
export * from '@oitq/core'
App.prototype.prepare=function (){
    this.koa=new Koa(this.options)
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
        await this.addBot(ctx.body)
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
    this.on('bot.add',(bot)=>{
        if(bot.options.oneBot){
            bot.oneBot=new OneBot(this,bot,typeof bot.options.oneBot==='boolean'?defaultOneBotConfig:merge(defaultOneBotConfig,bot.options.oneBot),this.options.port||8088)
            bot.once('system.online',()=>{
                bot.oneBot.start()
            })
            bot.on('message',bot.oneBot.dispatch.bind(bot.oneBot))
            bot.on('notice',bot.oneBot.dispatch.bind(bot.oneBot))
            bot.on('request',bot.oneBot.dispatch.bind(bot.oneBot))
        }
    })
    this.on('bot.remove',bot=>{
        if(bot.oneBot){
            bot.oneBot.stop()
        }
    })

    oldPrepare.apply(this)
}
const oldStart=App.prototype.start
App.prototype.start=async function (port:number=this.options.port){
    this.options.port=port
    this.httpServer.listen(port,()=>{
        console.log('app is listen at http://127.0.0.1:'+port)
    })
    oldStart.apply(this)
}
Context.service('router')
Context.service('koa')
