import {BotEventMap} from "./adapter";
import {Argv} from "./argv";
import {Session} from "./session";
import {App} from "./app";
import {Command} from "./command";
import {Service} from "./service";
import {Plugin} from './plugin'
import {Adapter} from "./adapter";

export type Filter<K extends keyof BotEventMap=App.MessageEvent>=(session:NSession<BotEventMap, K>)=>boolean
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "mark" | "off";
export type Awaitable<R extends any=void>=R|Promise<R>
export type TargetType = 'group' | 'private' | 'discuss'
export type NSession<M extends object,K extends keyof M>=M[K] extends (e:object,...args:infer O)=>any ? Extend<Define<Session, 'args', O>, Parameters<M[K]>[0]> : M[K] extends (...args:any[])=>any?Define<Session, 'args', Parameters<M[K]>>:unknown
export type ChannelId = `${TargetType}:${number}`
export type Dispose=()=>boolean
export type Dict<T extends any=any,K extends (symbol|string)=string>={
    [P in K]:T
}
export type Extend<B extends Dict,N extends Dict=Dict>={
    [P in (keyof B|keyof N)]:P extends keyof B?B[P]:P extends keyof N?N[P]:unknown
}
export type Define<D extends Dict,K extends string,V extends any=any>={
    [P in (K|keyof D)]:P extends keyof D?D[P]:P extends K?V:unknown
}
export type Middleware=(session:NSession<BotEventMap,App.MessageEvent>)=>Awaitable<boolean|string|void>
export interface Message{
    message_type:string
    message:any[]
    raw_message?:string
    cqCode?:string
}
export interface EventMap extends BotEventMap{
    'start'():void
    'dispose'():void
    'command-add'(command:Command):void
    'command-remove'(command:Command):void
    'adapter-start'(adapter:Adapter):void
    'adapter-dispose'(adapter:Adapter):void
    'plugin-start'(plugin:Plugin):void
    'plugin-dispose'(plugin:Plugin):void
    'service-start'(service:Service):void
    'service-dispose'(service:Service):void
    'before-command'(argv:Argv):Awaitable<string|boolean|void>
}
