import {App} from "@/core/app";
import {Bot} from "@/core/bot";
import {Dict} from "@/utils/types";
import {EventMap, Sendable} from "oicq";
import {Middleware} from "@/core/middleware";
import {MessageRet} from "oicq/lib/events";
import {Prompt} from "@/core/prompt";

export interface Session{
    message_type?:string
    post_type?:string
    notice_type?:string
    request_type?:string
    user_id?:number
    group_id?:number
    discuss_id?:number
    sub_type?:string
    reply?(content: Sendable, quote?: boolean): Promise<MessageRet>
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
    private promptReal<T extends keyof Prompt.TypeKV>(options:Prompt.Options<T>):Promise<Prompt.ValueType<T>|void>{
        if(['select','multipleSelect'].includes(options.type) && !options.choices) throw new Error('choices is required')
        return new Promise<Prompt.ValueType<T>|void>(resolve => {
            this.reply(Prompt.formatOutput(options))
            const dispose=this.middleware((session)=>{
                if(!options.validate || options.validate(session.message)){
                    let result=Prompt.formatValue(session,options.type,options)
                    dispose()
                    resolve(result)
                    clearTimeout(timer)
                }else{
                    this.reply(options.errorMsg)
                }
            })
            const timer=setTimeout(()=>{
                dispose()
                resolve()
            },options.timeout||this.app.options.delay.prompt)
        })
    }
    async prompt<T extends keyof Prompt.TypeKV>(options:Prompt.Options<T>|Array<Prompt.Options<T>>){
        options=[].concat(options)
        let result:Dict={}
        if(options.length===0) return
        if(options.length===1)return await this.promptReal(options[0])
        for(const option of options){
            if(!option.name) throw new Error('name is required')
            result[option.name]=await this.promptReal(option)
        }
        return result
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
