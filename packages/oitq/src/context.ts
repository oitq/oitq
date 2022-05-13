import {Bot, BotEventMap, ChannelId, NSession, TargetType} from "./bot";
import {App} from "./app";
import {Plugin} from "./plugin";
import {Action} from "./argv";
import {getLogger} from 'log4js'
import {Awaitable} from "@oitq/utils";
import {EventThrower} from "./event";
import {MessageRet} from "oicq";
type ServiceAction="load"|'change'|'destroy'|'enable'|'disable'
type ServiceListener<K extends keyof Plugin.Services = keyof Plugin.Services>=(key:K,service:Plugin.Services[K])=>void
type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never
type ServiceEventMap = {
    [P in ServiceAction as `service.${P}`]: ServiceListener;
};

export type BeforeEventMap = { [E in keyof AppEventMap & string as OmitSubstring<E, 'before-'>]: AppEventMap[E] }
export interface AppEventMap extends BotEventMap,ServiceEventMap{
    'start'():void
    'stop'():void
    'send'(messageRet:MessageRet,channelId:ChannelId):void
    'attach'(session:NSession<'message'>):Awaitable<void|string>
    'bot-add'(bot: Bot): void
    'bot-remove'(bot: Bot): void
    'plugin.install'(plugin: Plugin): void
    'plugin.enable'(plugin: Plugin): void
    'plugin.disable'(plugin: Plugin): void
    'plugin.destroy'(plugin: Plugin): void
}
export type Dispose=()=>boolean
export type MsgChannelId=`${number}-${TargetType}:${number}`
export interface Context extends Plugin.Services{
    on<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    on<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    before<E extends keyof BeforeEventMap>(name:E,listener:BeforeEventMap[E],append?:boolean):Dispose
    before<S extends string|symbol>(name:S & Exclude<S, keyof BeforeEventMap>,listener:(...args:any)=>void,append?:boolean):Dispose
    once<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    once<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    addEventListener<E extends keyof AppEventMap>(name:E,listener:AppEventMap[E],prepend?:boolean):Dispose;
    addEventListener<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,listener:(...args:any)=>void,prepend?:boolean):Dispose;
    emit<E extends keyof AppEventMap>(name:E,...args:Parameters<AppEventMap[E]>):boolean
    emit<S extends string|symbol>(name:S & Exclude<S, keyof AppEventMap>,...args:any[]):boolean
}
export class Context extends EventThrower{
    public app:App
    constructor(filter:Context.Filter=()=>true) {
        super();
    }

    getLogger(name: string) {
        const logger=getLogger(name)
        logger.level=process.env.OITQ_LOG_LEVEL||this.app.config.logLevel||'off'
        return logger
    }
}
export namespace Context{
    export type Filter=(session:NSession<'message'>)=>boolean
}
