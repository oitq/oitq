import 'oicq2-cq-enable';
import {EventMap as OicqEventMap} from "oicq";
import {OicqBot} from "./bot";
import {OicqAdapter} from "./adapter";
import {NSession, Adapter} from "oitq";
export * from './adapter'
export * from './bot'

type Transform = {
    [P in keyof OicqEventMap as `bot.${P}`]: (session: NSession<P>) => void
}

declare module 'oitq'{
    export namespace Bot{
        export interface EventMap extends Transform,OicqEventMap {
        }
        export interface Platforms{
            oicq:OicqBot
        }
    }
}

export default Adapter.define('oicq',OicqBot,OicqAdapter)
