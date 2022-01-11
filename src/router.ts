import KoaRouter = require('@koa/router');
import {MaybeArray} from "@/utils";
import {WsServer,WsCallback} from "./ws";
type Path=string|RegExp
export class Router extends KoaRouter {
    wsStack: WsServer[] = []
    whiteList:Path[]=[]//用于historyApi排除

    register(...args: Parameters<KoaRouter['register']>) {
        const path:Path=args[0]
        this.whiteList.push(path)
       return super.register(...args)
    }
    ws(path: MaybeArray<string | RegExp>, callback?: WsCallback) {
        const wsServer = new WsServer(this, path, callback)
        this.wsStack.push(wsServer)
        return wsServer
    }
}
