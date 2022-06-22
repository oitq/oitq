import 'oicq2-cq-enable';
import {EventMap as OicqEventMap,Config as OicqConfig} from "oicq";
import {OicqBot} from "./bot";
import {OicqAdapter} from "./adapter";
import {NSession,Adapter} from "oitq";
import {Bot} from "@oitq/oitq";

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

        export interface Config{
            platform:'oicq'
            admins?:number[]
            master?:number
            config?:OicqConfig
        }
    }
}

export const defaultOicqConfig:Bot.Config={
    admins:[],
    config:{
        data_dir:process.cwd()+'/data',
    },
    master:1659488338,
}

export default Adapter.define('oicq',OicqBot,OicqAdapter)
