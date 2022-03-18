import KoaRouter = require('@koa/router');
import * as http from "http";
import {Server} from 'ws'
type Path=string|RegExp
export class Router extends KoaRouter {
    wsStack: Server[] = []
    whiteList:Path[]=[]//用于historyApi排除

    register(...args: Parameters<KoaRouter['register']>) {
        const path:Path=args[0]
        this.whiteList.push(path)
       return super.register(...args)
    }
    ws(path:string, server:http.Server) {
        const wsServer = new Server({server,path})
        this.wsStack.push(wsServer)
        return wsServer
    }
}
