import * as path from "path";
import {Client, Config, EventMap, OnlineStatus} from 'oicq'
import {OneBotConfig} from "@/onebot/config";
import {OneBot} from "@/onebot";
import {merge} from "@/utils/functions";
import {dir} from "@/bin";
import {Session} from "@/core/session";
import {Define, Extend} from "@/utils/types";
import {App} from "@/core/app";
import {Middleware} from "@/core/middleware";
import {template} from "@/utils";
template.set('bot',{
    system:{
        login:{
            qrcode:'子账号:{0} 正在登录，请回复`辅助登录`以开始辅助该账号登录,{1}'
        }
    },
    prompt:{
        cancel:'输入`cancel`以取消'
    }
})
export type LoginType='qrcode'|'password'
export interface BotOptions{
    uin?:number
    config:Config,
    type:LoginType
    password?:string
    master?:number // 当前机器人主人
    admins?:number[] // 当前机器人管理员
    parent?:number // 机器人上级
    children?:number[] // 管理的机器人下属
    oneBot?:OneBotConfig|boolean
}
export type ToSession<A extends any[] = []>=A extends [object, ...infer O] ? Extend<Define<Session, 'args', O>, A[0]> : Define<Session, 'args', A>
export type NSession<E extends keyof EventMap> = ToSession<Parameters<EventMap[E]>>
type Transform = {
    [P in keyof EventMap as `bot.${P}`]:(session: NSession<P>) => void
}

export interface BotEventMap extends Transform{
    'bot.add'(bot:Bot):void
    'bot.remove'(bot:Bot):void
}
export const defaultBotOptions:BotOptions={
    type:'qrcode',
    children:[],
    admins:[],
    config:{
        platform:5,
        data_dir:path.join(dir,'data'),
        log_level:'debug'
    }
}
export class Bot extends Client{
    private options:BotOptions
    public oneBot:OneBot
    middlewares:Middleware[]=[]
    constructor(public app:App,options:BotOptions) {
        super(options.uin,merge(defaultBotOptions.config,options.config));
        this.options=merge(defaultBotOptions,options)
        this.bindChildListen()
        console.log(template('bot.system.login.qrcode','aaa',template('bot.prompt.cancel')))
    }
    middleware(middleware:Middleware,prepend?:boolean){
        const method:'unshift'|'push'=prepend?'unshift':'push'
        this.middlewares[method](middleware)
        return ()=>{
            const index=this.middlewares.indexOf(middleware)
            if(index>=0){
                this.middlewares.splice(index,1)
                return true
            }
            return false
        }
    }
    bindChildListen(){
        this.app.on('bot.system.login.qrcode',async (session)=>{
            if(this.status!==OnlineStatus.Online || !this.options.children.includes(session.bot.uin))return
            await this.broadcastAdmin('bot.system.login.qrcode',this.options.admins,session)
        })
    }
    async broadcastAdmin<E extends keyof EventMap>(event:`bot.${E}`,admins:number[],session:NSession<E>){
        for(const admin of admins){
            await this.sendPrivateMsg(admin,template(event,session.bot.uin))
        }
    }
    async handleMessage(session:NSession<'message'>){
        for(const middleware of this.middlewares){
            const result =await middleware(session)
            if(result) return result
        }
    }
    emit<E extends keyof EventMap>(name:E,...args:Parameters<EventMap[E]>){
        const session=this.createSession(name,...args)
        if(name==='message'){
            this.handleMessage(<NSession<'message'>>session).then(res=>{
                if(res){
                    if(typeof res==="boolean") return
                    (session as NSession<'message'>).reply(res)
                }else this.app.emit(`bot.${name}`,session)
            })
        }else{
            this.app.emit(`bot.${name}`,session)
        }
        this?.oneBot.dispatch(session)
        return super.emit(name,...args)
    }
    createSession<E extends keyof EventMap>(name:E,...args:Parameters<EventMap[E]>){
        let data:any=typeof args[0]==="object"?args.shift():{}
        if(!data)data={}
        data.args=args
        return new Session(this.app,this,data) as NSession<E>
    }

}
export class BotList extends Array<Bot> {
    constructor(public app:App) {
        super();
    }
    get(uin: number) {
        return this.find(bot => bot.uin === uin)
    }
    create(options: BotOptions) {
        const bot = new Bot(this.app,options)
        this.push(bot)
        this.app.emit('bot.add',bot)
        return bot
    }
    async remove(uin: number) {
        const index = this.findIndex(bot => bot.uin === uin)
        if (index < 0) {
            return false
        }
        const bot=this[index]
        await bot.logout()
        this.app.emit('bot.remove',bot)
        this.splice(index, 1)
        return true
    }

}
