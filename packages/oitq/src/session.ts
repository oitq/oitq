import {App, Bot,  Prompt} from "./";
import {EventMap, MessageElem, Sendable} from "oicq";
import {MessageRet} from "oicq/lib/events";
import {template, Awaitable, Dict, s} from "@oitq/utils";
import {Action} from "./argv";
import {ChannelId, Middleware, NSession} from './types'
export interface Session {
    self_id?: number
    cqCode?: string
    message_type?: string
    message?: MessageElem[]
    post_type?: string
    notice_type?: string
    request_type?: string
    user_id?: number
    group_id?: number
    discuss_id?: number
    sub_type?: string

    reply?(content: Sendable, quote?: boolean): Promise<MessageRet>
}

export type Computed<T> = T | ((session: NSession) => T)

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
    apply: (this: NSession, suggestion: string) => Awaitable<void | string>
}

export class Session {
    argv: Action
    parsed?: Parsed

    constructor(public app: App, public bot: Bot, data: Dict, public event_name: keyof EventMap) {
        Object.assign(this, data)
    }

    middleware(middleware: Middleware) {
        const channelId = this.getFromUrl()
        return this.app.middleware((session) => {
            if (session.getFromUrl() !== channelId) return
            middleware(session);
            return true
        }, true)
    }

    private promptReal<T extends keyof Prompt.TypeKV>(prev: any, answer: Dict, options: Prompt.Options<T>): Promise<Prompt.ValueType<T> | void> {
        if (typeof options.type === 'function') options.type = options.type(prev, answer, options)
        if (!options.type) return
        if (['select', 'multipleSelect'].includes(options.type as keyof Prompt.TypeKV) && !options.choices) throw new Error('choices is required')
        return new Promise<Prompt.ValueType<T> | void>(resolve => {
            this.sendMsg(Prompt.formatOutput(prev, answer, options))
            const dispose = this.middleware((session) => {
                const cb = () => {
                    let result = Prompt.formatValue(prev, answer, options, session.cqCode)
                    dispose()
                    resolve(result)
                    clearTimeout(timer)
                }
                if (!options.validate) {
                    cb()
                } else {
                    if (typeof options.validate !== "function") {
                        options.validate = (str: string) => (options.validate as RegExp).test(str)
                    }
                    try {
                        let result = options.validate(session.cqCode)
                        if (result && typeof result === "boolean") cb()
                        else this.sendMsg(options.errorMsg)
                    } catch (e) {
                        this.sendMsg(e.message)
                    }
                }
            })
            const timer = setTimeout(() => {
                dispose()
                resolve()
            }, options.timeout || this.app.config.delay.prompt)
        })
    }

    async prompt<T extends keyof Prompt.TypeKV>(options: Prompt.Options<T> | Array<Prompt.Options<T>>) {
        options = [].concat(options)
        let answer: Dict = {}
        let prev: any = undefined
        try {
            if (options.length === 0) return
            for (const option of options) {
                if (typeof option.type === 'function') option.type = option.type(prev, answer, option)
                if (!option.type) continue
                if (!option.name) throw new Error('name is required')
                prev = await this.promptReal(prev, answer, option)
                answer[option.name] = prev
            }
        } catch (e) {
            this.sendMsg(e.message)
            return
        }
        return answer as Prompt.Answers<Prompt.ValueType<T>>
    }

    async executeTemplate(template: string) {
        const session: NSession = this as any
        template = template.replace(/\$A/g, s('at', {type: 'all'}))
            .replace(/\$a/g, s('at', {id: session.user_id}))
            .replace(/\$m/g, s('at', {id: session.bot.uin}))
            .replace(/\$s/g, () => session.sender['card'] || session.sender['title'] || session.sender.nickname)
        while (template.match(/\$\(.*\)/)) {
            const text = /\$\((.*)\)/.exec(template)[1]
            const executeResult = await this.executeTemplate(text)
            if (typeof executeResult === 'string'){
                template = template.replace(/\$\((.*)\)/, executeResult)
            }
        }
        const result=await this.app.execute(this as any,template)
        if(result && typeof result!=="boolean")return result
        return template
    }
    async sendMsg(content:Sendable,channelId?:ChannelId){
        if(!channelId && this.post_type!=='message')throw new Error('非message会话发送消息需要提供ChannelId')
        if(!channelId)channelId=this.getChannelId()
        const result=await this.bot.sendMsg(channelId,content)
        this.app.emit('send',result,channelId)
        return result
    }
    getChannelId(): ChannelId {
        return [
            this.message_type,
            this.notice_type,
            this.request_type,
        ].filter(Boolean).join('.') + ':' + [
            this.group_id || this.discuss_id || this.user_id,
        ].filter(Boolean).join('.') as ChannelId
    }

    getFromUrl() {
        return [
            this.post_type,
            this.message_type,
            this.notice_type,
            this.request_type,
            this.sub_type,
        ].filter(Boolean).join('.') + ':' + [
            this.group_id,
            this.discuss_id,
            this.user_id
        ].filter(Boolean).join('.')
    }

    resolveValue<T>(source: T | ((session: Session) => T)): T {
        return typeof source === 'function' ? Reflect.apply(source, null, [this]) : source
    }

    text(path: string | string[], params: object = {}) {
        return template(path, params)
    }

    toJSON(...besides: string[]) {
        return Object.fromEntries(Object.entries(this).filter(([key, value]) => {
            return !['app', 'bot'].includes(key) && !key.startsWith('_') && !besides.includes(key)
        }))
    }
}
