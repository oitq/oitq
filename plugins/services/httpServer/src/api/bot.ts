import {Router} from "../router";
import {success,error,remove} from "@oitq/utils";
import {App,Bot} from "oitq";

export function createBotApi(this:App,router:Router){
    router.post('/add',async (ctx,next)=>{
        if(!ctx.request.body || Object.keys(ctx.request.body).length==0) return ctx.body=error('请输入完整bot配置，具体配置见github（BotOptions）')
        const botOptions:Bot.Config=ctx.request.body
        await this.addBot(botOptions)
        ctx.body=success('添加成功')
        this.config.bots.push(botOptions)
        await next()
    })
    router.post('/submitSlider/:uin',async (ctx,next)=>{
        const {uin}=ctx.params
        const {ticket}=ctx.request.body
        if(!ticket) ctx.body=error('请输入需要提交的ticket')
        const bot=this.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.submitSlider(ticket)
        ctx.body=success('提交SliderTicket成功')
        await bot.login()
        await next()
    })
    router.post('/submitSmsCode/:uin',async (ctx,next )=>{
        const {uin}=ctx.params
        const {sms}=ctx.request.body
        if(!sms) ctx.body=error('请输入需要提交的短信验证码')
        const bot=this.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.submitSmsCode(sms)
        ctx.body=success('提交短信验证码成功')
        await bot.login()
        await next()
    })
    router.post('/login/:uin',async (ctx,next )=>{
        const {uin}=ctx.params
        const {password}=ctx.request.body
        const bot=this.bots.get(Number(uin))
        if(!bot)ctx.body=error(`bot:${uin}不存在`)
        await bot.login(password)
        ctx.body=success('调用登录方法成功')
        await next()
    })
    router.get('/remove',async (ctx,next)=>{
        const {uin}=ctx.query
        if(!uin) ctx.body=error('请输入uin')
        this.removeBot(Number(uin))
        const botOptions=this.config.bots.find(c=>c.uin===Number(uin))
        remove(this.config.bots,botOptions)
        ctx.body= success('移除成功')
        await next()
    })
}
