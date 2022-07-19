import KoaRouter = require('@koa/router');
import * as http from "http";
import {Server} from 'ws'
import { parse } from 'url';
type Path=string|RegExp
export class Router extends KoaRouter {
    wsStack: Server[] = []
    whiteList:Path[]=[]//用于historyApi排除

    register(...args: Parameters<KoaRouter['register']>) {
        const path:Path=args[0]
        this.whiteList.push(path)
        return super.register(...args)
    }
    ws(path:string, server?:http.Server) {
        const wsServer = new Server({ noServer: true,path })
        this.wsStack.push(wsServer)

        server!.on('upgrade',(request, socket, head)=>{
            const { pathname } = parse(request.url);
            if(this.wsStack.findIndex(wss=>wss.options.path===path)===-1){
                socket.destroy()
            }else if (pathname === path) {
                wsServer.handleUpgrade(request, socket, head, function done(ws) {
                    wsServer.emit('connection', ws, request);
                });
            }
        })
        return wsServer
    }
}
