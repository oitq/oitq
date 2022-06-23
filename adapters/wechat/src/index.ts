import {EventMap as WechatEventMap} from "lib-wechat";
import {WechatBot} from "./bot";
import {WechatAdapter} from "./adapter";
import {NSession,Adapter} from "oitq";
export * from './adapter'
export * from './bot'

type Transform = {
    [P in keyof WechatEventMap as `bot.${P}`]: (session: NSession<P>) => void
}

declare module 'oitq'{
    export namespace Bot{
        export interface EventMap extends Transform,WechatEventMap {
        }
        export interface Platforms{
            wechat:WechatBot
        }
    }
}


export default Adapter.define('oicq',WechatBot,WechatAdapter)
