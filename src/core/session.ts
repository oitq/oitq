import {App} from "@/core/app";
import {Bot} from "@/core/bot";
import {Dict} from "@/utils/types";
import {MessageElem, Sendable} from "oicq";
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
    private promptReal<T extends keyof Prompt.TypeKV>(prev:any,answer:Dict,options:Prompt.Options<T>):Promise<Prompt.ValueType<T>|void>{
        if(typeof options.type==='function')options.type=options.type(prev,answer,options)
        if(!options.type)return
        if(['select','multipleSelect'].includes(options.type as keyof Prompt.TypeKV) && !options.choices) throw new Error('choices is required')
        return new Promise<Prompt.ValueType<T>|void>(resolve => {
            this.reply(Prompt.formatOutput(prev,answer,options))
            const dispose=this.middleware((session)=>{
                if(!options.validate || options.validate(session.message)){
                    let result=Prompt.formatValue(prev,answer,options,session.message)
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
        let answer:Dict={},prev:any=undefined
        try{
            if(options.length===0) return
            if(options.length===1)return await this.promptReal(prev,answer,options[0])
            for(const option of options){
                if(typeof option.type==='function')option.type=option.type(prev,answer,option)
                if(!option.type)continue
                if(!option.name) throw new Error('name is required')
                prev=await this.promptReal(prev,answer,option)
                answer[option.name]=prev
            }
        }catch (e){
            this.reply(e.message)
            return
        }
        return answer
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
