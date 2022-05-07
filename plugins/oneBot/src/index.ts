import {Context,Bot} from "oitq";
import {merge} from "@oitq/utils";
import {OneBot} from "./onebot";
import {OneBotConfig,defaultOneBotConfig} from "./config";

declare module 'oitq'{
    interface Bot{
        oneBot?:OneBot
    }
    interface BotConfig{
        oneBot?:boolean|OneBotConfig
    }
}
export const using=['httpServer'] as const
export function install(ctx:Context){
    ctx.on('bot.add',async (bot:Bot)=>{
        if(bot.options.oneBot){
            bot.oneBot=new OneBot(ctx.app,bot,typeof bot.options.oneBot==='boolean'?defaultOneBotConfig:merge(defaultOneBotConfig,bot.options.oneBot))
            bot.on('message',(data)=>bot.oneBot.dispatch(data))
            bot.on('notice',(data)=>bot.oneBot.dispatch(data))
            bot.on('request',(data)=>bot.oneBot.dispatch(data))
            bot.on('system',(data)=>bot.oneBot.dispatch(data))
            await bot.oneBot.start()
        }
    })
    ctx.on('bot.remove',(bot:Bot)=>{
        if(bot.oneBot){
            bot.oneBot.stop()
        }
    })
}
