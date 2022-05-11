import { Plugin, noop, template,Bot } from 'oitq'
export interface Config {
    exitCommand?: boolean | string
    autoRestart?: boolean
}
declare module 'oitq'{
    interface AppConfig extends Config{}
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
export const name='daemon'
export function install(plugin: Plugin, config: Config = {}) {
    const { exitCommand, autoRestart = true } = config

    function handleSignal(signal: NodeJS.Signals) {
        plugin.logger.info(`terminated by ${signal}`)
        process.exit()
    }

    exitCommand && plugin
        .command(exitCommand === true ? 'exit' : exitCommand, 'message.private')
        .desc('关闭bot')
        .check(async ({session})=>{
            if(!session.bot.isMaster(session.user_id)&&!session.bot.isAdmin(session.user_id)){
                return '权限不足'
            }
        })
        .option('restart', '-r  重新启动')
        .shortcut('关机')
        .shortcut('重启', { option: { restart: true } })
        .action(async ({ options, session }) => {
            const channelId = [session.message_type,session.group_id||session.discuss_id||session.user_id].join(':');
            if (!options.restart) {
                await session.sendMsg(template('daemon.exiting')).catch(noop)
                process.exit()
            }
            process.send({ type: 'queue', body: { channelId,sid:session.bot.uin, message: template('daemon.restarted') } })
            await session.sendMsg(template('daemon.restarting')).catch(noop)
            process.exit(51)
        })

    plugin.on('ready', () => {
        process.send({ type: 'start', body: { autoRestart } })
        process.on('SIGINT', handleSignal)
        process.on('SIGTERM', handleSignal)
    })

    process.on('message', (data: Message) => {
        if (data.type === 'send') {
            const { channelId, sid, message } = data.body
            const bot=plugin.app.bots.get(Number(sid))
            if(bot.isOnline()){
                bot.sendMsg(channelId, message)
            }else{
                const dispose = plugin.on('bot.system.online', (session) => {
                    const bot:Bot=session.bot
                    if (bot.uin !== sid) return
                    bot.sendMsg(channelId, message)
                    dispose()
                })
            }
        }
    })
}
