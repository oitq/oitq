import {Service,Bot,deepMerge} from "oitq";
import {OneBot} from "./onebot";
import {OneBotConfig,defaultOneBotConfig} from "./config";
declare module 'oitq'{
    interface Bot{
        oneBot?:OneBot
    }
    namespace Bot{
        interface Options{
            oneBot?:boolean|OneBotConfig
        }
    }
}
async function startOneBot(bot:Bot){
    bot.oneBot=new OneBot(plugin.app,bot as any,typeof bot.options.oneBot==='boolean'?defaultOneBotConfig:deepMerge(defaultOneBotConfig,bot.options.oneBot))
    bot.on('message',(data)=>bot.oneBot.dispatch(data))
    bot.on('notice',(data)=>bot.oneBot.dispatch(data))
    bot.on('request',(data)=>bot.oneBot.dispatch(data))
    bot.on('system',(data)=>bot.oneBot.dispatch(data))
    await bot.oneBot.start()
}
const plugin=new Service('oneBot',__dirname)
plugin.on('start',()=>{
    for(const bot of plugin.app.bots){
        startOneBot(bot)
    }
    plugin.on('bot-add',async (bot:Bot)=>{
        if(bot.options.oneBot){
            startOneBot(bot)
        }
    })
    plugin.on('bot-remove',(bot:Bot)=>{
        if(bot.oneBot){
            bot.oneBot.stop()
        }
    })
    plugin.on('dispose',()=>{
        for(const bot of plugin.app.bots){
            if(bot.oneBot) bot.oneBot.stop()
        }
    })
})
if(plugin.app.started)plugin.emit('start',)
