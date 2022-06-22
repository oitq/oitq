import {Plugin} from "./plugin";
import {Bot} from "./bot";
import {EventMap, MessageRet, Sendable} from "oicq";
import {Awaitable, Define, Extend} from "@oitq/utils";
import {Command} from "./command";
import {Session} from "./session";
// common
export type Dispose=()=>boolean
type ServiceAction="load"|'change'|'destroy'|'enable'|'disable'
type ServiceListener<K extends keyof Plugin.Services = keyof Plugin.Services>=(key:K,service:Plugin.Services[K])=>void
type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never
type ServiceEventMap = {
    [P in ServiceAction as `service.${P}`]: ServiceListener;
};
// bot
export type TargetType = 'group' | 'private' | 'discuss'
export type ChannelId = `${TargetType}:${number}`
// session
export type Filter=(session:NSession)=>boolean
export type ToSession<A extends any[] = []> = A extends [object, ...infer O] ? Extend<Define<Session, 'args', O>, A[0]> : Define<Session, 'args', A>
export type NSession<E extends keyof EventMap='message'> = ToSession<Parameters<EventMap[E]>>
// plugin
export type Middleware=(session:NSession<any>)=>Awaitable<boolean|Sendable|void>
export type MsgChannelId=`${number}-${TargetType}:${number}`
// eventMap
export type BeforeEventMap = { [E in keyof AppEventMap & string as OmitSubstring<E, 'before-'>]: AppEventMap[E] }
export interface AppEventMap extends Bot.EventMap,ServiceEventMap{
    'ready'():void
    'dispose'():void
    'send'(messageRet:MessageRet,channelId:ChannelId):void
    'continue'(session:NSession):Promise<string|boolean|void>
    'attach'(session:NSession):Awaitable<void|string>
    'bot-add'(bot: Bot): void
    'bot-remove'(bot: Bot): void
    'command-add'(command: Command): void
    'command-remove'(command: Command): void
    'plugin-add'(plugin: Plugin): void
    'plugin-enable'(plugin: Plugin): void
    'plugin-disable'(plugin: Plugin): void
    'plugin-remove'(plugin: Plugin): void
    'service-add'(plugin: Plugin): void
    'service-enable'(plugin: Plugin): void
    'service-disable'(plugin: Plugin): void
    'service-remove'(plugin: Plugin): void
}
