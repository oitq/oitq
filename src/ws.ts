import WebSocket from 'ws';
import {IncomingMessage} from 'http'
import {MaybeArray,remove} from '@/utils';
import { pathToRegexp } from 'path-to-regexp'
import parseUrl = require('parseurl')
import {Router} from "@/router";
export type WsCallback = (socket: WebSocket, request: IncomingMessage) => void
export class WsServer{
    clients = new Set<WebSocket>()
    regexp: RegExp
    constructor(private router:Router,path:MaybeArray<string | RegExp>,public callback?:WsCallback) {
        this.regexp=pathToRegexp(path)
    }
    accept(socket: WebSocket, request: IncomingMessage) {
        if (!this.regexp.test(parseUrl(request).pathname)) return
        this.clients.add(socket)
        socket.on('close', () => {
            this.clients.delete(socket)
        })
        this.callback?.(socket, request)
    }
    close() {
        remove(this.router.wsStack, this)
        for (const socket of this.clients) {
            socket.close()
        }
    }
}