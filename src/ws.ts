import WebSocket from 'ws';
import {IncomingMessage} from 'http'
import {MaybeArray,remove} from '@/utils';
import { pathToRegexp } from 'path-to-regexp'
import parseUrl = require('parseurl')
import {Router} from "@/router";
export type WsCallback = (socket: WebSocket, request: IncomingMessage) => void
export class WsServer{
    clients:Record<number, Set<WebSocket>>
    regexp: RegExp
    constructor(private router:Router,path:MaybeArray<string | RegExp>,public callback?:WsCallback) {
        this.regexp=pathToRegexp(path)
        this.clients={}
    }
    accept(uin:number,socket: WebSocket, request: IncomingMessage) {
        const botClient=this.clients[uin]||=new Set<WebSocket>()
        if (!this.regexp.test(parseUrl(request).pathname)) return
        botClient.add(socket)
        socket.on('close', () => {
            botClient.delete(socket)
        })
        this.clients[uin]=botClient
        this.callback?.(socket, request)
    }
    close(uin:number) {
        const botClient=this.clients[uin]||new Set<WebSocket>()
        remove(this.router.wsStack, this)
        for (const socket of botClient) {
            socket.close()
        }
    }
}