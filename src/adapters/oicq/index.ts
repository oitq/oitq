import {Adapter, NSession} from "oitq";
import {OicqBot} from "./bot";
import {EventMap} from "oicq";
export type OicqEventMap={
    [P in keyof EventMap as `oicq.${P}`]:(session:NSession<EventMap, P>)=>void
}
export * from './bot'
const oicqAdapter=new Adapter<OicqBot>('oicq',__dirname)
oicqAdapter.Constructor=OicqBot
for(const bot of oicqAdapter.config.bots){
    oicqAdapter.create(bot)
}
if(oicqAdapter.app.started) oicqAdapter.emit('start')
export namespace OicqAdapter{
    export interface Config{
        bots?:OicqBot.Options[]
    }
}
