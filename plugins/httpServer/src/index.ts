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
export function install(context:Plugin,config:HttpServerConfig){
    const koa=new Koa(config)
    const router=new Router({prefix:config.path})
    const httpServer=createServer(koa.callback()) as HttpServer
    httpServer.port=config.port
    context.app.httpServer=httpServer
    context.app.koa=koa
    context.app.router=router
    koa
        .use(KoaBodyParser())
        .use(router.routes())
        .use(router.allowedMethods())
    httpServer.listen(config.port,()=>{
        context.getLogger('app').mark('app is listen at http://127.0.0.1:'+config.port)
    })
    context.app.emit('httpServer.ready')
}
