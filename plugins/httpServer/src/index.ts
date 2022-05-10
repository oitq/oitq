import {Plugin,App} from "oitq";
import Koa from 'koa'
import {Router} from "./router";
import {createServer, Server} from "http";
import KoaBodyParser from "koa-bodyparser";
import {error, success} from "@oitq/utils";
declare module 'oitq'{
    export namespace App{
        export interface Services{
            koa:Koa
            router:Router
            httpServer:HttpServer
        }
    }
}
class HttpServer extends Server{
    public port:number
}
export interface KoaOptions{
    env?: string
    keys?: string[]
    proxy?: boolean
    subdomainOffset?: number
    proxyIpHeader?: string
    maxIpsCount?: number
}
export interface HttpServerConfig extends KoaOptions{
    path?:string
    port:number
}
export const name='httpServer'
export function install(context:App,config:HttpServerConfig){
    const koa=new Koa(config)
    const router=new Router({prefix:config.path})
    const httpServer=createServer(koa.callback()) as HttpServer
    httpServer.port=config.port
    context.httpServer=httpServer
    context.koa=koa
    context.router=router
    koa
        .use(KoaBodyParser())
        .use(router.routes())
        .use(router.allowedMethods())
    router.get('',(ctx)=>{
        ctx.body='this is oicq-bots api\n' +
            'use post request to visit `/${uin}/method` to apply bot method,post data will used by method params\n' +
            'use websocket to connect `/uin` to listen bot request/notice'
    })
    router.post('/add',async (ctx,next)=>{
        if(!ctx.request.body || Object.keys(ctx.request.body).length==0) return ctx.body=error('请输入完整bot配置，具体配置见github（BotOptions）')
        await context.app.addBot(ctx.request.body)
        ctx.body=success('添加成功')
        await next()
    })
    router.post('/submitSlider/:uin',async (ctx,next)=>{
        const {uin}=ctx.params
        const {ticket}=ctx.request.body
        if(!ticket) ctx.body=error('请输入需要提交的ticket')
        const bot=context.app.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.submitSlider(ticket)
        ctx.body=success('提交SliderTicket成功')
        next()
    })
    router.post('/submitSmsCode/:uin',async (ctx,next )=>{
        const {uin}=ctx.params
        const {sms}=ctx.request.body
        if(!sms) ctx.body=error('请输入需要提交的短信验证码')
        const bot=context.app.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.submitSmsCode(sms)
        ctx.body=success('提交短信验证码成功')
        next()
    })
    router.post('/login/:uin',async (ctx,next )=>{
        const {uin}=ctx.params
        const {password}=ctx.request.body
        const bot=context.app.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.login(password)
        ctx.body=success('调用登录方法成功')
        next()
    })
    router.get('/remove',async (ctx,next)=>{
        const {uin}=ctx.query
        if(!uin) ctx.body=error('请输入uin')
        await context.app.removeBot(Number(uin))
        await next()
        ctx.body= success('移除成功')
    })
    httpServer.listen(config.port,()=>{
        context.getLogger('app').mark('app is listen at http://127.0.0.1:'+config.port)
    })
}
