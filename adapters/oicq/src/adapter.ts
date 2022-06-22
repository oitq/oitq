import {Adapter,Plugin,Bot} from "oitq";
import {Client} from "oicq";
import {OicqBot} from "./bot";
declare module 'oitq'{
    export namespace Bot{
        export interface Platforms{
            oicq:Client
        }
    }
}
export class OicqAdapter<S extends Bot.BaseConfig,T extends OicqAdapter.Config> extends Adapter<S,T>{
    constructor(plugin:Plugin,config:T) {
        super('oicq',plugin,config);
    }
    start(){
        for(const bot of this.bots){
            this.startBot(bot)
        }
    }
    stop(){
        for(const bot of this.bots){
            this.startBot(bot)
        }
    }
    startBot(bot: OicqBot): Awaitable<void> {
        return bot.login(bot.options.password)
    }
    stopBot(bot: OicqBot): Awaitable<void> {
        bot.logout()
    }
}
export namespace OicqAdapter{
    export interface Config{

    }
}
