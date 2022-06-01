import {Bot, NSession, Plugin, remove} from "oitq";
import {DataTypes} from "@oitq/service-database";
import {Platform, segment} from "oicq";

declare module '@oitq/service-database' {
    interface User {
        bots: number[]
    }
}
export const using = ['database'] as const

async function loginBot(session: NSession, bot: Bot, password): Promise<[boolean, string]> {
    return new Promise<[boolean, string]>(resolve => {
        const disposes = [
            session.app.on('bot.system.online', (sess) => {
                if (sess.bot !== bot) return
                disposes.forEach(dispose => dispose())
                resolve([true, null])
            }),
            session.app.on('bot.system.login.qrcode', async (sess) => {
                if (sess.bot !== bot) return
                const {confirm} = await session.prompt({
                    type: 'confirm',
                    name: 'confirm',
                    message: ['请扫描登录二维码后回复任意内容继续\n', segment.image(sess.image)]
                })
                if (!confirm) return resolve([false, '用户取消登录'])
                bot.login(password)
            }),
            session.app.on('bot.system.login.device', async (sess) => {
                if (sess.bot !== bot) return
                bot.sendSmsCode()
                const {sms} = await session.prompt({
                    type: 'text',
                    name: 'sms',
                    message: '请输入你手机收到的验证码后继续'
                })
                if (!sms) return
                bot.submitSmsCode(sms)
            }),
            session.app.on('bot.system.login.error', async (sess) => {
                if (sess.bot !== bot) return
                if ((sess.message as unknown as string).includes('密码错误')) {
                    const {newPass} = await session.prompt({
                        type: 'text',
                        name: 'newPass',
                        message: '密码错误，请重新输入（输入cancel可取消）'
                    })
                    if (!newPass) {
                        resolve([false, '输入超时，已取消'])
                        disposes.forEach(dispose => dispose())
                    }
                    if (newPass === 'cancel') {
                        resolve([false, '已取消'])
                        disposes.forEach(dispose => dispose())
                    }
                    bot.login(newPass)
                } else {
                    resolve([false, sess.message as unknown as string])
                    disposes.forEach(dispose => dispose())
                }
            }),
        ]
        bot.login(password)
    })
}

export interface ChildConfig {
    bot_platform?:Platform,
    bot_login_type?:'password'|'qrcode'
}

export function install(plugin: Plugin,config:ChildConfig={bot_login_type:'qrcode',bot_platform:5}) {
    plugin.database.extend('User', {
        bots: {
            type: DataTypes.TEXT,
            get() {
                return JSON.parse(this.getDataValue('bots') || '[]') || []
            },
            set(value: number[]) {
                this.setDataValue('bots', JSON.stringify(value) as any)
            }
        }
    })
    plugin.database.define('Bot', {
        uin: DataTypes.INTEGER,
        password: DataTypes.STRING,
        config: {
            type: DataTypes.TEXT,
            defaultValue: '{}',
            get() {
                return JSON.parse(this.getDataValue('config') || '{}') || []
            },
            set(config: Bot.Config) {
                this.setDataValue('config', JSON.stringify(config) as any)
            }
        }
    })
    plugin.app.before('database.ready', () => {
        const {Bot} = plugin.database.models
        Bot.hasMany(Bot, {as: 'children'})
        Bot.belongsTo(Bot, {as: 'parent'})
    })
    plugin.app.on('database.ready', () => {
        plugin.app.on('bot-add', async (bot) => {
            const botInstance = (await plugin.database.model('Bot').findOne({
                where: {uin: bot.uin},
                include: {
                    model: plugin.database.model('Bot'),
                    as: 'children'
                }
            }))
            if(!botInstance) return
            const {children=[]}=botInstance.toJSON()
            if (children.length) {
                for(const botConfig of children){
                    plugin.app.addBot(botConfig)
                }
            }
        })
    })
    plugin.command('admin/bot', 'message.private')
        .desc('管理子账户')
    plugin.command('admin/bot/bot.login', 'message.private')
        .desc('登录子账户')
        .option('type', `-t <loginType:string> 登录方式(password or qrcode) 默认:${config.bot_login_type}`, {initial:config.bot_login_type})
        .option('platform', `-p <platform:integer> 登录协议(1-5) 默认:${config.bot_platform}，详见oicq文档`, {initial:config.bot_platform })
        .action(async ({session, options}) => {
            const {uin, password} = await session.prompt([
                {
                    type: 'number',
                    message: '请输入uin',
                    name: 'uin'
                },
                {
                    type: options.type === 'qrcode' ? null : 'text',
                    message: '请输入密码',
                    name: 'password'
                }
            ])
            if (plugin.app.bots.get(uin as number)) return `uin(${uin})已存在`
            const bot = plugin.app.addBot({
                uin: Number(uin),
                master: session.user_id,
                config: {platform: options.platform}
            })
            const [success, err] = await loginBot(session, bot, password)
            if (success) {
                const user = await plugin.database.model('User').findOne({where: {user_id: session.user_id}})
                const [parent] = await plugin.database.model('Bot').findOrCreate({
                    where: {uin: session.bot.uin},
                    defaults: {parentId: null, config: session.bot.options}
                })
                const [child] = await plugin.database.model('Bot').findOrCreate({
                    where: {uin},
                    defaults: {
                        parentId: parent.toJSON().id,
                        password,
                        config: {
                            uin,
                            master: session.user_id,
                            config: {
                                platform: options.platform
                            }
                        }
                    }
                })
                user.update({bots: [...user.toJSON().bots, uin]})
                child.update({parentId: parent.toJSON().id})
                return '登录成功'
            }
            plugin.app.removeBot(bot.uin)
            return err
        })
    plugin.command('admin/bot/bot.remove <uin:integer>', 'message')
        .desc('移除你登录的子账户')
        .auth(4)
        .check(async ({session}, uin) => {
            if (!session.user.bots.includes(uin)) return '你还没有登录该账户或该账户不属于你管理'
        })
        .action(async ({session: {user_id, user: {bots}}}, uin) => {
            const bot = await plugin.database.model('Bot').findOne({where: {uin}})
            if (!bot) return '为找到bot:' + uin
            const user = await plugin.database.model('User').findOne({where: {user_id}})
            plugin.app.removeBot(uin)
            await bot.destroy()
            remove(bots, uin)
            await user.update({bots})
            return '已移除bot:' + uin
        })
}
