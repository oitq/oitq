import {Plugin} from "./plugin";
import {App} from './app'
import {
    template,
} from "@oitq/utils";
import {Adapter} from "./adapter";
import {ChannelId} from "./types";

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
    config:T
    sid:string
    sendMsg(channelId:ChannelId,message:string)
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
    }
    export interface Config{
        platform:keyof Platforms
    }
    export interface EventMap{
        'bot-add'(bot: Bot): void
        'bot-remove'(bot: Bot): void
    }
}
