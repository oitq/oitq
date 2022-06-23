import {Adapter,Plugin,Bot} from "oitq";
import {WechatBot} from "./bot";
export class WechatAdapter<S extends WechatBot.Config,T extends WechatAdapter.Config> extends Adapter<S,T>{
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
export namespace WechatAdapter{
    export interface Config{

    }
}
