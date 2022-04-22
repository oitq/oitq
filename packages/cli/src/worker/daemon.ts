import { Context, noop, template,Bot } from 'oitq'
export interface Config {
    exitCommand?: boolean | string
    autoRestart?: boolean
}

template.set('daemon', {
    exiting: '正在关机……',
    restarting: '正在重启……',
    restarted: '已成功重启。',
})

interface Message {
    type: 'send'
    body: any
}

export const name = 'daemon'

export function install(ctx: Context, config: Config = {}) {
    const { exitCommand, autoRestart = true } = config

    function handleSignal(signal: NodeJS.Signals) {
        ctx.logger('app').info(`terminated by ${signal}`)
        process.exit()
    }

    exitCommand && ctx
        .command(exitCommand === true ? 'exit' : exitCommand, '停止机器人运行', { authority: 4 })
        .option('restart', '-r  重新启动')
        .shortcut('关机', { prefix: true })
        .shortcut('重启', { prefix: true, options: { restart: true } })
        .action(async ({ options, session }) => {
            const channelId = [session.message_type,session.group_id||session.discuss_id||session.user_id].join(':');
            if (!options.restart) {
                await session.reply(template('daemon.exiting')).catch(noop)
                process.exit()
            }
            process.send({ type: 'queue', body: { channelId,sid:session.bot.uin, message: template('daemon.restarted') } })
            await session.reply(template('daemon.restarting')).catch(noop)
            process.exit(51)
        })

    ctx.on('ready', () => {
        process.send({ type: 'start', body: { autoRestart } })
        process.on('SIGINT', handleSignal)
        process.on('SIGTERM', handleSignal)
    })

    process.on('message', (data: Message) => {
        if (data.type === 'send') {
            const { channelId, sid, message } = data.body
            const dispose = ctx.on('bot.system.online', (session) => {
                const bot:Bot=session.bot
                if (bot.uin !== sid) return
                bot.sendMsg(channelId, message)
                dispose()
            })
        }
    })
}
