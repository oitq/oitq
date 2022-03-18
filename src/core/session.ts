import {App} from "@/core/app";
import {Bot} from "@/core/bot";
import {Dict} from "@/utils/types";
import {EventMap, Sendable} from "oicq";
import {Middleware} from "@/core/middleware";
export interface Session{
    message_type?:string
    post_type?:string
    notice_type?:string
    request_type?:string
    user_id?:number
    group_id?:number
    discuss_id?:number
    sub_type?:string
}
export class Session{
    constructor(public app:App,public bot:Bot,data:Dict) {
        Object.assign(this,data)
    }
    middleware(middleware:Middleware){
        const channelId=this.getChannelId()
        return this.bot.middleware(session => {
            if(session.getChannelId()!==channelId) return
            middleware(session);
            return true
        },true)
    }
    prompt(timeout:number=this.app.options.delay.prompt){
        return new Promise<Sendable>(resolve => {
            const dispose=this.middleware((session)=>{
                dispose()
                resolve(session.message)
                clearTimeout(timer)
            })
            const timer=setTimeout(()=>{
                dispose()
                resolve('')
            },timeout)
        })
    }
    getChannelId(){
        return [
            this.post_type,
            this.message_type,
            this.notice_type,
            this.request_type,
            this.sub_type,
        ].filter(Boolean).join('.')+':'+[
            this.group_id,
            this.discuss_id,
            this.user_id
        ].filter(Boolean).join('.')
    }
    toJSON(){
        return Object.fromEntries(Object.entries(this).filter(([key,value])=>{
            return !['app','bot'].includes(key) && !key.startsWith('_')
        }))
    }
}
export namespace Session{
    export interface Payload<E extends keyof EventMap>{
        event:E
        data:Parameters<EventMap[E]>
    }
}
