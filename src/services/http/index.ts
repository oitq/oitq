import {getIpAddress, Service} from "oitq";
import Koa from 'koa'
import {createServer} from "http";
import KoaBodyParser from "koa-bodyparser";
import {Router} from "./router";
export const name='http'
export function install(service:Service,config:HttpService.Config){
    const koa=new Koa()
    // @ts-ignore
    const router=new Router({prefix:config.path})
    const server=createServer(koa.callback())
    service.app.koa=koa
    service.app.router=router
    service.app.server=server
    const oldWs=router.ws
    router.ws=(path:string,s?)=>{
        if(!s)s=server
        return oldWs.apply(router,[path,s])
    }
    koa.use(KoaBodyParser())
        .use(router.routes())
        .use(router.allowedMethods())
    service.on('start',()=>{

        server.listen(config.port)
        service.logger.info(`server listen at http://${getIpAddress()}:${config.port}`)
    })
    service.on('dispose',()=>{
        server.close()
    })
    if(service.app.started) service.emit("start")
}
export namespace HttpService{
    export interface Config{
        port?:number
        path?:string
    }
}
