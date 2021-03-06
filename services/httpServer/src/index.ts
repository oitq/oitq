import {Plugin} from "oitq";
import Koa from 'koa'
import {Router} from "./router";
import {createServer, Server} from "http";
import {Requester} from "./requester";
import KoaBodyParser from "koa-bodyparser";
import {bindApis} from "./api";
declare module 'oitq'{
    namespace App{
        interface Config extends HttpServerConfig{}
    }
    export namespace Plugin{
        export interface Services{
            koa:Koa
            router:Router
            axios:Requester
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
export {Requester,Router}
export interface HttpServerConfig extends KoaOptions{
    host?:string
    path?:string
    port:number
}
export const name='httpServer'
export function install(plugin:Plugin){
    const logger=plugin.getLogger('httpLog')
    const {config}=plugin.app
    const koa=new Koa(config)
    const router=new Router({prefix:config.path})
    const httpServer=createServer(koa.callback()) as HttpServer
    httpServer.port=config.port||8086
    plugin.koa=koa
    plugin.axios=Requester.create()
    plugin.router=router
    plugin.httpServer=httpServer
    koa
        .use(async (ctx,next)=>{
        const start = new Date()
        await next()
        const ms = new Date().getTime() - start.getTime()
        logger.info(`${ctx.request.method}: ${ JSON.stringify(ctx.request.url) } -${ms}ms`)
    })
        .use(KoaBodyParser())
        .use(router.routes())
        .use(router.allowedMethods())
    bindApis(router,plugin.app)
    httpServer.listen(httpServer.port,()=>{
        plugin.getLogger('app').mark(`app is listen at http://${config.host||'localhost'}${config.path||''}:${httpServer.port}`)
    })
    plugin.app.emit('httpServer.ready')
}
Plugin.service('httpServer')
Plugin.service('koa')
Plugin.service('router')
Plugin.service('axios')
