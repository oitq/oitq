import { App, Awaitable, Plugin, Dict } from 'oitq'
import { v4 } from 'uuid'
import {WebSocket,WebSocketServer} from 'ws'
import { DataService } from './service'
import {} from '@oitq/service-http-server'
export class SocketHandle {
    readonly app: App
    readonly id: string = v4()

    constructor(service: WsService, public socket: WebSocket) {
        this.app = service.plugin.app
        this.refresh()
    }

    send(payload: any) {
        this.socket.send(JSON.stringify(payload))
    }

    refresh() {
        Plugin.Services.forEach(async (name) => {
            const service = this.app[name] as DataService
            if (!name.startsWith('console.') || !service) return
            const key = name.slice(8)
            const value = await service.get()
            if (!value) return
            this.send({ type: 'data', body: { key, value } })
        })
    }
}

export interface Listener extends DataService.Options {
    callback: Listener.Callback
}

export namespace Listener {
    export type Callback = (this: SocketHandle, ...args: any[]) => Awaitable<any>
}

class WsService extends DataService {
    readonly handles: Dict<SocketHandle> = {}
    readonly listeners: Dict<Listener> = {}
    readonly layer: WebSocketServer

    constructor(public plugin: Plugin, private config: WsService.Config) {
        super(plugin, 'ws')

        this.layer = plugin.router.ws('/'+config.apiPath, plugin.httpServer)
        this.layer.on('connection',this.onConnection)
    }

    broadcast(type: string, body: any, options: DataService.Options = {}) {
        const handles = Object.values(this.handles)
        if (!handles.length) return
        const data = JSON.stringify({ type, body })
        Promise.all(Object.values(this.handles).map(async (handle) => {
            handle.socket.send(data)
        }))
    }

    addListener(event: string, listener: Listener) {
        this.listeners[event] = listener
    }

    stop() {
        this.layer.close()
    }

    private onConnection = (socket: WebSocket) => {
        const handle = new SocketHandle(this, socket)
        this.handles[handle.id] = handle
        socket.on('message', async (data) => {
            const { type, args, id } = JSON.parse(data.toString())
            const listener = this.listeners[type]
            if (!listener) {
                return handle.send({ type: 'response', body: { id, error: 'not implemented' } })
            }
            try {
                const value = await listener.callback.call(handle, ...args)
                return handle.send({ type: 'response', body: { id, value } })
            } catch (e) {
                return handle.send({ type: 'response', body: { id, error: e.message } })
            }
        })
    }
}

namespace WsService {
    export interface Config {
        selfUrl?: string
        apiPath?: string
    }
}

export default WsService
