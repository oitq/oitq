import {Plugin} from "oitq";
import Koa from 'koa'
import {Router} from "./router";
import {createServer, Server} from "http";
import KoaBodyParser from "koa-bodyparser";
declare module 'oitq'{
    namespace App{
        interface Config extends HttpServerConfig{}
    }
    export namespace Plugin{
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
    host?:string
    path?:string
    port:number
}
export const name='httpServer'
export function install(plugin:Plugin){
    const {config}=plugin.app
    const koa=new Koa(config)
    const router=new Router({prefix:config.path})
    const httpServer=createServer(koa.callback()) as HttpServer
    httpServer.port=config.port
    plugin.httpServer=httpServer
    plugin.koa=koa
    plugin.router=router
    koa
        .use(KoaBodyParser())
        .use(router.routes())
        .use(router.allowedMethods())
    httpServer.listen(config.port,()=>{
        plugin.getLogger('app').mark(`app is listen at http://${config.host||'localhost'}${config.path||''}:${config.port}`)
    })
    plugin.app.emit('httpServer.ready')
}
Plugin.service('httpServer')
Plugin.service('koa')
Plugin.service('router')
