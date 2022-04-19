import {Client, Config, EventMap, MessageElem, Quotable, Sendable} from 'oicq'
import {App} from './app'
import {Session} from './session'
import {Middleware} from './middleware'
import {defaultBotOptions} from './static'
import {
    merge,
    template,
    Define,
    Extend,
    fromCqcode,
    defineProperty,
    makeArray,
    escapeRegExp,
    valueMap
} from "@oitq/utils";
import {Argv} from "@lc-cn/command";
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

export interface BotOptions {
    uin?: number
    config: Config,
    type: LoginType
    password?: string
    nickname?: string | string[]
    prefix?: string | string[]
    master?: number // 当前机器人主人
    admins?: number[] // 当前机器人管理员
    parent?: number // 机器人上级
}

export type ToSession<A extends any[] = []> = A extends [object, ...infer O] ? Extend<Define<Session, 'args', O>, A[0]> : Define<Session, 'args', A>
export type NSession<E extends keyof EventMap> = ToSession<Parameters<EventMap[E]>>
type Transform = {
    [P in keyof EventMap as `bot.${P}`]: (session: NSession<P>) => void
}

export interface BotEventMap extends Transform {
    'bot.add'(bot: Bot): void

    'bot.remove'(bot: Bot): void
}

function createLeadingRE(patterns: string[], prefix = '', suffix = '') {
    return patterns.length ? new RegExp(`^${prefix}(${patterns.map(escapeRegExp).join('|')})${suffix}`) : /$^/
}

export class Bot extends Client {
    private options: BotOptions
    middlewares: Middleware[] = []
    private _nameRE: RegExp

    constructor(public app: App, options: BotOptions) {
        super(options.uin, merge(defaultBotOptions.config, options.config));
        this.options = merge(defaultBotOptions, options)
        if (!options.parent) {
            this.startProcessLogin()
        }
        const {nickname} = this.options
        this.options.nickname = makeArray(nickname) as string[]
        this._nameRE = createLeadingRE(this.options.nickname, '@?', '([,，]\\s*|\\s+)')
    }

    // message处理中间件，受拦截的message不会上报到'bot.message'
    middleware(middleware: Middleware, prepend?: boolean) {
        const method = prepend ? 'unshift' : 'push'
        this.middlewares[method](middleware)
        return () => {
            const index = this.middlewares.indexOf(middleware)
            if (index >= 0) {
                this.middlewares.splice(index, 1)
                return true
            }
            return false
        }
    }

    startProcessLogin() {
        const processDeviceLogin = ({url}) => {
            console.log(`请复制下面的url在浏览器打开，完成设备验证后输入任意内容继续，${template('bot.prompt.cancel')}\n${url}`)
            process.stdin.once('data', (buf) => {
                const input = buf.toString().trim()
                if (input === 'cancel') return
                this.login()
            })
        }
        const processQrcodeLogin = () => {
            console.log(`请使用手机qq扫描控制台中的二维码，完成扫码登录后输入任意内容继续，${template('bot.prompt.cancel')}\n`)
            process.stdin.once('data', (buf) => {
                const input = buf.toString().trim()
                if (input === 'cancel') return
                this.qrcodeLogin()
            })
        }
        const processSliderLogin = ({url}) => {
            console.log(`请复制下面的url在浏览器打开，完成扫码登录后输入任意内容继续，${template('bot.prompt.cancel')}\n${url}`)
            process.stdin.once('data', (buf) => {
                const input = buf.toString().trim()
                if (input === 'cancel') return
                this.submitSlider(input)
            })
        }
        const processPasswordLogin = (message) => {
            console.log(`${message},${template('bot.prompt.cancel')}`)
            process.stdin.once('data', (buf) => {
                const input = buf.toString().trim()
                if (input === 'cancel') return
                this.login(input)
            })
        }
        const processSmsLogin = (message) => {
            this.sendSmsCode()
            console.log(`${message},正在尝试进行手机验证登录，请输入账号绑定手机收到的验证码以继续登录，${template('bot.prompt.cancel')}`)
            process.stdin.once('data', (buf) => {
                const input = buf.toString().trim()
                if (input === 'cancel') return
                this.submitSmsCode(input)
            })
        }
        const processLoginErrorHandler = ({message}) => {
            if (message.includes('密码错误')) {
                processPasswordLogin('密码错误，请重新输入密码')
            } else if (message.includes('二维码')) {
                processSmsLogin('二维码登录失败')
            }
        }
        this.on('system.login.device', processDeviceLogin)
        this.on('system.login.qrcode', processQrcodeLogin)
        this.on('system.login.slider', processSliderLogin)
        this.on('system.login.error', processLoginErrorHandler)
        this.on('system.online', () => {
            this.removeListener('system.login.device', processDeviceLogin)
            this.removeListener('system.login.qrcode', processQrcodeLogin)
            this.removeListener('system.login.slider', processSliderLogin)
            this.removeListener('system.login.error', processLoginErrorHandler)
        })
    }

    async createAdminLink<E extends keyof EventMap>(event: `bot.${E}`, admins: number[], bot: Bot) {
        return new Promise<NSession<'message.private'>>(async resolve => {
            for (const admin of admins) {
                await this.sendPrivateMsg(admin, template(event, bot.uin, template('bot.prompt.cancel')))
                this.on('bot.message.private', function getSession(session: NSession<'message.private'>) {
                    if (session.user_id === admin) {
                        if (session.raw_message === '辅助登录') {
                            this.off('bot.message.private', getSession)
                            resolve(session)
                        }
                    }
                })
            }
        })

    }

    startBotLogin(session: NSession<'message.private'>, bot: Bot) {
        const botDeviceLogin = async ({url}) => {
            const {confirm} = await session.prompt({
                type: 'confirm',
                name: 'confirm',
                message: `请复制下面的url在浏览器打开，完成设备验证后继续，\n${url}`
            })
            if (confirm) bot.login()
        }
        const botQrcodeLogin = async () => {
            const {confirm} = await session.prompt({
                type: 'confirm',
                name: 'confirm',
                message: `请使用手机qq扫描控制台中的二维码，完成扫码登录后继续`
            })
            if (confirm) bot.qrcodeLogin()
        }
        const botSliderLogin = async ({url}) => {
            const {input} = await session.prompt({
                type: 'text',
                name: 'input',
                message: `请复制下面的url在浏览器打开，完成扫码登录后继续\n${url}`
            })
            if (input) bot.submitSlider(input)
        }
        const botPasswordLogin = async (message) => {
            const {input} = await session.prompt({
                type: 'text',
                name: 'input',
                message
            })
            if (input) bot.login(input)
        }
        const botSmsLogin = async (message) => {
            this.sendSmsCode()
            const {input} = await session.prompt({
                type: 'text',
                name: 'input',
                message: `${message},正在尝试进行手机验证登录，请输入账号绑定手机收到的验证码以继续`
            })
            if (input) bot.submitSmsCode(input)
        }
        const botLoginErrorHandler = ({message}) => {
            if (message.includes('密码错误')) {
                botPasswordLogin('密码错误，请重新输入密码')
            } else if (message.includes('二维码')) {
                botSmsLogin('二维码登录失败')
            }
        }
        this.on('system.login.device', botDeviceLogin)
        this.on('system.login.qrcode', botQrcodeLogin)
        this.on('system.login.slider', botSliderLogin)
        this.on('system.login.error', botLoginErrorHandler)
        this.on('system.online', () => {
            this.removeListener('system.login.device', botDeviceLogin)
            this.removeListener('system.login.qrcode', botQrcodeLogin)
            this.removeListener('system.login.slider', botSliderLogin)
            this.removeListener('system.login.error', botLoginErrorHandler)
        })
    }


    async handleCommand(session: NSession<'message'>) {
        this.app.emit('before-command', Argv.parse(session.cqCode))
        return session.execute(session.cqCode)
    }

    private _resolvePrefixes(session: NSession<'message'>) {
        const temp = session.resolveValue(this.options.prefix)
        return Array.isArray(temp) ? temp : [temp || '']
    }

    async handleMessage(session: NSession<'message'>) {
        let capture: RegExpMatchArray
        let atSelf = false, appel = false, prefix: string = null
        const pattern = /^\[CQ:(\w+)((,\w+=[^,\]]*)*)\]/
        let content = session.cqCode
        // strip prefix
        if (session.message_type !== 'private' && (capture = content.match(pattern)) && capture[1] === 'at' && capture[2].includes('qq=' + session.self_id)) {
            atSelf = appel = true
            content = content.slice(capture[0].length).trimStart()
            // eslint-disable-next-line no-cond-assign
        } else if (capture = content.match(this._nameRE)) {
            appel = true
            content = content.slice(capture[0].length)
        }

        for (const _prefix of this._resolvePrefixes(session)) {
            if (!content.startsWith(_prefix)) continue
            prefix = _prefix
            content = content.slice(_prefix.length)
        }
        defineProperty(session, 'parsed', {content, appel, prefix})
        await this.app.parallel('before-attach', session)
        let result = await this.handleShortcut(session)
        if (result) return result
        result = await this.handleCommand(session)
        if (result) return result
        for (const middleware of this.middlewares) {
            const result = await middleware(session)
            if (result) return result
        }
    }

    private handleShortcut(session: NSession<'message'>) {
        const {parsed} = session
        const argv = session.argv ||= Argv.parse(session.cqCode)
        let content = session.cqCode
        for (const shortcut of this.app._shortcuts) {
            const {name, fuzzy, command, prefix, options = {}, args = []} = shortcut
            if (prefix && !parsed.appel || !command.context.match(session)) continue
            if (typeof name === 'string') {
                if (!fuzzy && content !== name || !content.startsWith(name)) continue
                const message = content.slice(name.length)
                if (fuzzy && !parsed.appel && message.match(/^\S/)) continue
                const argv = command.parse(Argv.parse(message.trim()), [...args], {...options})
                argv.command = command
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

                return command.execute({
                    ...argv,
                    command,
                    tokens:[],
                    name: command.name,
                    args: args.map(escape),
                    options: valueMap(options, escape),
                })
            }
        }
    }

    // 重写emit，将event data封装成session，上报到app
    emit<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>) {
        const session = this.createSession(name, ...args)

        if (name === 'message') {
            this.handleMessage(<NSession<'message'>>session).then(res => {
                if (res) {
                    if (typeof res === "boolean") return
                    (session as NSession<'message'>).reply(res)
                } else this.app.emit(`bot.${name}`, session)
            })
        } else {
            this.app.emit(`bot.${name}`, session)
        }
        if (name.startsWith('system') && this.options.parent) {
            this.createAdminLink(`bot.${name}`, this.options.admins, this).then((link) => {
                this.startBotLogin(link, this)
            })
        }
        return super.emit(name, ...args)
    }

    createSession<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>) {
        let data: any = typeof args[0] === "object" ? args.shift() : {}
        if (!data) data = {}
        data.args = args
        return new Session(this.app, this, data) as unknown as NSession<E>
    }

    /**
     * 发送消息
     * @param channelId 通道id
     * @param content 消息内容，如果为CQ码会自动转换
     * @param source 引用的消息，为string时代表消息id
     */
    async sendMsg(channelId: ChannelId, content: Sendable, source?: Quotable | string): Promise<MessageRet> {
        try {
            if (typeof content === 'string') content = fromCqcode(content)
            if (Array.isArray(content)) content = content.reduce((total: (string | MessageElem)[], current) => {
                if (typeof current === 'string') total = total.concat(fromCqcode(current))
                else total.push(current)
                return total
            }, [])
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
                    return this.pickUser(Number(id)).sendMsg(content, source)
            }
            throw new Error('无效的通道Id')
        } catch (e) {
            throw e
        }
    }

}

export class BotList extends Array<Bot> {
    constructor(public app: App) {
        super();
    }

    get(uin: number) {
        return this.find(bot => bot.uin === uin)
    }

    create(options: BotOptions) {
        const bot = new Bot(this.app, options)
        this.push(bot)
        this.app.emit('bot.add', bot)
        return bot
    }

    async remove(uin: number) {
        const index = this.findIndex(bot => bot.uin === uin)
        if (index < 0) {
            return false
        }
        const bot = this[index]
        await bot.logout()
        this.app.emit('bot.remove', bot)
        this.splice(index, 1)
        return true
    }

}
