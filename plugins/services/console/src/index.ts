import { Plugin, Service } from 'oitq'
import HttpService, { Entry } from './http'
import WsService from './ws'
import { DataService } from './service'

export * from './service'
export * from './http'
export * from './ws'

type NestedServices = {
    [K in keyof Console.Services as `console.${K}`]: Console.Services[K]
}

declare module 'oitq' {
    namespace Plugin {
        interface Services extends NestedServices {
            console: Console
        }
    }
}

export interface ClientConfig {
    devMode: boolean
    uiPath: string
    endpoint: string
}

export interface Console extends Console.Services {}

export class Console extends Service {
    public global = {} as ClientConfig

    constructor(public plugin: Plugin, public config: Console.Config) {
        super(plugin, 'console')

        const { devMode, uiPath, apiPath, selfUrl } = config
        this.global.devMode = devMode
        this.global.uiPath = uiPath
        this.global.endpoint = selfUrl + apiPath

        plugin.plugin(HttpService, config)
        plugin.plugin(WsService, config)
    }

    addEntry(filename: string | Entry) {
        this.http.addEntry(filename)
    }

    addListener<K extends keyof Events>(event: K, callback: Events[K], options?: DataService.Options) {
        this.ws.addListener(event, { callback, ...options })
    }
}

export interface Events {}

export namespace Console {
    export interface Config extends HttpService.Config, WsService.Config {}


    export interface Services {
        http?: HttpService
        ws?: WsService
    }
}

export default Console
