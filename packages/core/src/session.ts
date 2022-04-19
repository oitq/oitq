import {App, Bot, Middleware, NSession, Prompt} from ".";
import {MessageElem, Sendable} from "oicq";
import {MessageRet} from "oicq/lib/events";
import {toCqcode, template, valueMap, Awaitable, Dict, fromCqcode} from "@oitq/utils";
import {Argv} from "@lc-cn/command";
export interface Session{
    self_id?:number
    message_type?:string
    cqCode?:string
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
    argv:Argv
    parsed?: Parsed
    constructor(public app:App,public bot:Bot,data:Dict) {
        Object.assign(this,data)
        if(data.message){
            this.cqCode=toCqcode(data)
        }
        if(data.reply){
            this.reply=(content)=>{
                const messageList=[].concat(content).map(c=>typeof c==='string'?fromCqcode(c):c).flat(1)
                return data.reply(messageList)
            }
        }
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
        let answer:Dict={}
        let prev:any=undefined
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
        return answer as Prompt.Answers<Prompt.ValueType<T>>
    }
    private _handleShortcut(content=this.cqCode):Argv{
        for (const shortcut of this.app._shortcuts) {
            const {name, fuzzy, command, prefix, options = {}, args = []} = shortcut
            if (typeof name === 'string') {
                if (!fuzzy && content !== name || !content.startsWith(name)) continue
                const message = content.slice(name.length)
                if (fuzzy  && message.match(/^\S/)) continue
                const argv = Argv.parse(message.trim())
                argv.command = command
                argv.name=command?.name
                return argv
            } else {
                const capture = name.exec(content)
                if (!capture) continue

                function escape(source: any) {
                    if (typeof source !== 'string') return source
                    source = source.replace(/\$\$/g, '@@__PLACEHOLDER__@@')
                    capture.forEach((segment, index) => {
                        if (!index || index > 9) return
                        source = source.replace(new RegExp(`\\$${index}`, 'g'), (segment || '').replace(/\$/g, '@@__PLACEHOLDER__@@'))
                    })
                    return source.replace(/@@__PLACEHOLDER__@@/g, '$')
                }
                return {
                    command,
                    name:command?.name,
                    args: args.map(escape),
                    options: valueMap(options, escape),
                }
            }
        }
    }

    async execute(content:string=this.cqCode){
        for(const [,command] of this.app._commands){
            const argv=Argv.parse(content)
            argv.bot=this.bot
            argv.session=this as any
            const shortcutArgv=this._handleShortcut(content)
            if(shortcutArgv) Object.assign(argv,shortcutArgv)
            const result=await command.execute(argv)
            if(result) return result
        }
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
