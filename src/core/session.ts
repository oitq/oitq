import {App, Bot, Middleware, NSession, Prompt} from "@/core";
import {Awaitable, Dict} from "@/utils/types";
import {MessageElem, Sendable} from "oicq";
import {MessageRet} from "oicq/lib/events";
import {template} from "@/utils";
export interface Session{
    message_type?:string
    message?:MessageElem[]
    post_type?:string
    notice_type?:string
    request_type?:string
    user_id?:number
    group_id?:number
    discuss_id?:number
    sub_type?:string
    reply?(content: Sendable, quote?: boolean): Promise<MessageRet>
}
export type Computed<T> = T | ((session: NSession<'message'>) => T)
export interface Parsed {
    content: string
    prefix: string
    appel: boolean
}
export interface SuggestOptions {
    target: string
    items: string[]
    prefix?: string
    suffix: string
    minSimilarity?: number
    apply: (this: NSession<'message'>, suggestion: string) => Awaitable<void | string>
}
export class Session{

    parsed?: Parsed
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
    resolveValue<T>(source: T | ((session: Session) => T)): T {
        return typeof source === 'function' ? Reflect.apply(source, null, [this]) : source
    }
    text(path: string | string[], params: object = {}) {
        return template(path,params)
    }
    toJSON(){
        return Object.fromEntries(Object.entries(this).filter(([key,value])=>{
            return !['app','bot'].includes(key) && !key.startsWith('_')
        }))
    }
}
