import {Adapter,Plugin,Bot} from "oitq";
import {OicqBot} from "./bot";
export class OicqAdapter<S extends OicqBot.Config,T extends OicqAdapter.Config> extends Adapter<S,T>{
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
    startBot(bot: Bot){
        return bot.start()
    }
    stopBot(bot: Bot){
        bot.stop()
    }
}
export namespace OicqAdapter{
    export interface Config{

    }
}
