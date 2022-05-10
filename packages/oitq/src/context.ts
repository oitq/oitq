import {Bot, BotEventMap, TargetType} from "./bot";
import {App} from "./app";
import {Plugin, PluginManager} from "./plugin";
import {Action} from "./argv";
import {getLogger} from 'log4js'
import {Awaitable} from "@oitq/utils";
import {EventFeeder} from "./event";
import {Middleware} from "./middleware";
type ServiceAction="load"|'change'|'destroy'|'enable'|'disable'
type ServiceListener<K extends keyof App.Services = keyof App.Services>=(key:K,service:App.Services[K])=>void
type ServiceEventMap = {
    [P in ServiceAction as `service.${P}`]: ServiceListener;
};

export interface AppEventMap extends BotEventMap,ServiceEventMap{
    'start'():void
    'stop'():void
    'command.execute.before'(argv: Action): Awaitable<void | string>
    'command.execute.after'(argv: Action): Awaitable<void | string>
    'bot.add'(bot: Bot): void
    'bot.remove'(bot: Bot): void
    'plugin.install'(plugin: Plugin): void
    'plugin.enable'(plugin: Plugin): void
    'plugin.disable'(plugin: Plugin): void
    'plugin.destroy'(plugin: Plugin): void
}
export type Dispose=()=>boolean
export type MsgChannelId=`${number}-${TargetType}:${number}`
export interface Context{
    on<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    on<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    before<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],append?:boolean):Dispose
    before<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,append?:boolean):Dispose
    once<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    once<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    addEventListener<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    addEventListener<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    emit<E extends keyof AppEventMap>(name:E,...args:Parameters<AppEventMap[E]>):boolean
    emit<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,...args:any[]):boolean
}
export class Context extends EventFeeder{
    public app:App
    constructor() {
        super();
    }

// message处理中间件，受拦截的message不会上报到'bot.message'
    middleware(middleware: Middleware, prepend?: boolean) {
        const method = prepend ? 'unshift' : 'push'
        this.app.middlewares[method](middleware)
        return () => {
            const index = this.app.middlewares.indexOf(middleware)
            if (index >= 0) {
                this.app.middlewares.splice(index, 1)
                return true
            }
            return false
        }
    }
    getLogger(name: string) {
        const logger=getLogger(name)
        logger.level=this.app.config.logLevel
        return logger
    }
}
