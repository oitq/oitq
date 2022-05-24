import {Plugin,Bot} from "oitq";
import { merge} from "@oitq/utils";
import {OneBot} from "./onebot";
import {OneBotConfig,defaultOneBotConfig} from "./config";
import {} from '@oitq/plugin-http-server'
declare module 'oitq'{
    interface Bot{
        oneBot?:OneBot
    }
    namespace Bot{
        interface Config{
            oneBot?:boolean|OneBotConfig
        }
    }
}
export const name='oneBot'
export const using=['httpServer'] as const
export function install(plugin:Plugin){
    plugin.app.on('bot-add',async (bot:Bot)=>{
        if(bot.options.oneBot){
            bot.oneBot=new OneBot(plugin.app,bot,typeof bot.options.oneBot==='boolean'?defaultOneBotConfig:merge(defaultOneBotConfig,bot.options.oneBot))
            bot.on('message',(data)=>bot.oneBot.dispatch(data))
            bot.on('notice',(data)=>bot.oneBot.dispatch(data))
            bot.on('request',(data)=>bot.oneBot.dispatch(data))
            bot.on('system',(data)=>bot.oneBot.dispatch(data))
            await bot.oneBot.start()
        }
    })
    plugin.app.on('bot-remove',(bot:Bot)=>{
        if(bot.oneBot){
            bot.oneBot.stop()
        }
    })
}
