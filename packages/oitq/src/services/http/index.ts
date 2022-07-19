import {getIpAddress, Service} from "oitq";
import Koa from 'koa'
import {createServer} from "http";
import KoaBodyParser from "koa-bodyparser";
import {Router} from "./router";
const httpService=new Service('http',__dirname)
const config:HttpService.Config=httpService.config
const koa=new Koa()
const router=new Router({prefix:config.path})

const oldWs=router.ws
const server=createServer(koa.callback())
router.ws=(path:string,s?)=>{
    if(!s)s=server
    return oldWs.apply(router,[path,s])
}
koa.use(KoaBodyParser())
    .use(router.routes())
    .use(router.allowedMethods())
httpService.on('start',()=>{
    server.listen(config.port)
    httpService.logger.info(`server listen at http://${getIpAddress()}:${config.port}`)
})
httpService.on('dispose',()=>{
    server.close()
})
if(httpService.app.started) httpService.emit("start")
export namespace HttpService{
    export interface Config{
        port?:number
        path?:string
    }
}
