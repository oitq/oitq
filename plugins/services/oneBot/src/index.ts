import {Plugin,Bot} from "oitq";
import {error, merge, success} from "@oitq/utils";
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
    plugin.router.post('/add',async (ctx,next)=>{
        if(!ctx.request.body || Object.keys(ctx.request.body).length==0) return ctx.body=error('请输入完整bot配置，具体配置见github（BotOptions）')
        await plugin.app.addBot(ctx.request.body as Bot.Config)
        ctx.body=success('添加成功')
        await next()
    })
    plugin.router.post('/submitSlider/:uin',async (ctx,next)=>{
        const {uin}=ctx.params
        const {ticket}=ctx.request.body
        if(!ticket) ctx.body=error('请输入需要提交的ticket')
        const bot=plugin.app.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.submitSlider(ticket)
        ctx.body=success('提交SliderTicket成功')
        next()
    })
    plugin.router.post('/submitSmsCode/:uin',async (ctx,next )=>{
        const {uin}=ctx.params
        const {sms}=ctx.request.body
        if(!sms) ctx.body=error('请输入需要提交的短信验证码')
        const bot=plugin.app.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.submitSmsCode(sms)
        ctx.body=success('提交短信验证码成功')
        next()
    })
    plugin.router.post('/login/:uin',async (ctx,next )=>{
        const {uin}=ctx.params
        const {password}=ctx.request.body
        const bot=plugin.app.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.login(password)
        ctx.body=success('调用登录方法成功')
        next()
    })
    plugin.router.get('/remove',async (ctx,next)=>{
        const {uin}=ctx.query
        if(!uin) ctx.body=error('请输入uin')
        plugin.app.removeBot(Number(uin))
        await next()
        ctx.body= success('移除成功')
    })
}
