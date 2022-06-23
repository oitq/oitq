import {Plugin} from "./plugin";
import {App} from './app'
import {
    Awaitable,
    template,
} from "@oitq/utils";
import {Adapter} from "./adapter";
import {ChannelId, NSession} from "./types";
import {and} from "@vueuse/core";

template.set('bot', {
    system: {
        login: {
            qrcode: '子账号:{0} 正在登录，请回复`辅助登录`以开始辅助该账号登录,{1}'
        }
    },
    prompt: {
        cancel: '输入`cancel`以取消'
    }
})

export interface Bot<T extends Bot.BaseConfig=Bot.BaseConfig>{
    app:App
    adapter:Adapter
    plugin:Plugin
    platform:keyof Bot.Platforms
    options:T
    sid:string
    sendMsg(channelId:ChannelId,message:string)
    start():Awaitable<void>
    stop():Awaitable<void>
    [key:string]:any
}
export namespace Bot{
    export const library: Record<string, Bot.Constructor> = {}
    export interface Constructor<S extends Bot.BaseConfig = Bot.BaseConfig>{
        new(adapter:Adapter,config:S):Bot<S>
    }
    export interface BaseConfig{
        platform:keyof Platforms
    }
    export interface Platforms{
        [index:string]:Bot
    }
    export type Config<B extends Bot=Bot>= {
        platform:Bot['platform']
        [key:string]:any
    } & B['options']
    export interface EventMap{
        'bot-add'(bot: Bot): void
        'bot-remove'(bot: Bot): void
        'message'(session: any): void
    }
}
