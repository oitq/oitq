import {Client, Config as ClientConfig, EventMap, Quotable, Sendable} from 'oicq'
import {App} from './app'
import {Session} from './session'
import {defaultBotConfig} from './static'
import {
    merge,
    template,
    Define,
    Extend,
    makeArray,
    escapeRegExp,
} from "@oitq/utils";
import {MessageRet} from "oicq/lib/events";
template.set('bot', {
    system: {
        login: {
            qrcode: '子账号:{0} 正在登录，请回复`辅助登录`以开始辅助该账号登录,{1}'
        }
    },
    prompt: {
        cancel: '输入`cancel`以取消'
    }
})

export type TargetType = 'group' | 'private' | 'discuss'
export type ChannelId = `${TargetType}:${number}`
export type LoginType = 'qrcode' | 'password'

export type ToSession<A extends any[] = []> = A extends [object, ...infer O] ? Extend<Define<Session, 'args', O>, A[0]> : Define<Session, 'args', A>
export type NSession<E extends keyof EventMap> = ToSession<Parameters<EventMap[E]>>
type Transform = {
    [P in keyof EventMap as `bot.${P}`]: (session: NSession<P>) => void
}

export interface BotEventMap extends Transform,EventMap {
    'bot-add'(bot: Bot): void

    'bot-remove'(bot: Bot): void
}

function createLeadingRE(patterns: string[], prefix = '', suffix = '') {
    return patterns.length ? new RegExp(`^${prefix}(${patterns.map(escapeRegExp).join('|')})${suffix}`) : /$^/
}

export class Bot extends Client {
    options: Bot.Config
    private _nameRE: RegExp
    admins:number[]=[]
    master:number
    constructor(public app: App, options: Bot.Config) {
        super(options.uin, merge(defaultBotConfig.config, {logLevel:app.config.logLevel,...options.config}));
        this.options = merge(defaultBotConfig, options)
        this.admins=options.admins||[]
        this.master=options.master||null
        const {nickname} = this.options
        this.options.nickname = makeArray(nickname) as string[]
        this._nameRE = createLeadingRE(this.options.nickname, '@?', '([,，]\\s*|\\s+)')
    }
    isMaster(user_id:number){
        return this.options.master===user_id
    }
    isAdmin(user_id:number){
        return this.options.admins.includes(user_id)
    }



    // 重写emit，将event data封装成session，上报到app
    emit<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>) {
        const session=this.createSession(name,...args)
        if(name.startsWith('message')){
            this.app.dispatch('attach',session).finally(()=>{
                this.app.emit(`bot.${name}`,session)
            })
        }else {
            this.app.emit(`bot.${name}`,session)
        }
        this.app.emit(name,...args)
        return super.emit(name, ...args)
    }

    createSession<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>) {
        let data: any = typeof args[0] === "object" ? args.shift() : {}
        if (!data) data = {}
        data.args = args
        return new Session(this.app, this, data,name) as unknown as NSession<E>
    }

    /**
     * 发送消息
     * @param channelId 通道id
     * @param content 消息内容，如果为CQ码会自动转换
     * @param source 引用的消息，为string时代表消息id
     */
    async sendMsg(channelId: ChannelId, content: Sendable, source?: Quotable | string): Promise<MessageRet> {
        if (typeof source === 'string') source = await this.getMsg(source) as Quotable
        const [type, id] = channelId.split(':')
        switch (type) {
            case "discuss":
                return this.pickDiscuss(Number(id)).sendMsg(content)
            case 'group':
                if (!this.gl.get(Number(id))) throw new Error(`我没有加入群:${id}`)
                return this.pickGroup(Number(id)).sendMsg(content, source)
            case 'private':
                if (!this.fl.get(Number(id))) throw new Error(`我没有添加用户:${id}`)
                return this.pickFriend(Number(id)).sendMsg(content, source)
        }
        throw new Error('无效的通道Id')
    }
    async broadcast(channelIds:(ChannelId|number)[],message:Sendable){
        const result=[]
        for(const channelId of channelIds){
            if(typeof channelId==="number")result.push(await this.sendPrivateMsg(channelId,message))
            else result.push(await this.sendMsg(channelId,message))
        }
        return result
    }

}
export namespace Bot{

    export interface Config {
        uin?: number
        config: ClientConfig,
        type: LoginType
        password?: string
        nickname?: string | string[]
        prefix?: string | string[]
        master?: number // 当前机器人主人
        admins?: number[] // 当前机器人管理员
        parent?: number // 机器人上级
    }

}
export class BotList extends Array<Bot> {
    constructor(public app: App) {
        super();
    }

    get(uin: number) {
        return this.find(bot => bot.uin === uin)
    }

    create(options: Bot.Config) {
        const bot = new Bot(this.app, options)
        this.push(bot)
        this.app.emit('bot-add', bot)
        return bot
    }

    remove(uin: number) {
        const index = this.findIndex(bot => bot.uin === uin)
        if (index < 0) {
            return false
        }
        const bot = this[index]
        this.app.emit('bot-remove', bot)
        this.splice(index, 1)
        return true
    }

}
