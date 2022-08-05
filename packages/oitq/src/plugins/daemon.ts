import {OitqPlugin, template, noop, Bot} from "oitq";

const plugin = new OitqPlugin('daemon', __filename)
plugin.appendTo('builtin')
plugin
    .using("plugin",'watcher')
    .app.on('oicq.message',(a)=>{
        console.log(a.cqCode)
    })
plugin.appendTo('builtin')
console.log(plugin.app.pluginGroup)
const config: DaemonConfig = plugin.config || {}
const {exitCommand=true, autoRestart = true} = config

function handleSignal(signal: NodeJS.Signals) {
    plugin.logger.info(`terminated by ${signal}`)
    process.exit()
}
template.set('daemon', {
    exiting: '正在关机……',
    restarting: '正在重启……',
    restarted: '已成功重启。',
})
exitCommand && plugin
    .command(exitCommand === true ? 'exit' : exitCommand, 'all')
    .desc('关闭bot')
    .check(async ({session}) => {
        if (!session.bot.isMaster(session.user_id) && !session.bot.isAdmin(session.user_id)) {
            return '权限不足'
        }
    })
    .option('restart', '-r  重新启动')
    .shortcut('关机')
    .shortcut('重启', {options: {restart: true}})
    .action(async ({options, session}) => {
        const channelId = [session.message_type, session.group_id || session.discuss_id || session.user_id].join(':');
        if (!options.restart) {
            await session.sendMsg(template('daemon.exiting')).catch(noop)
            process.exit()
        }
        process.send({type: 'queue', body: {channelId, sid: session.bot.uin, message: template('daemon.restarted')}})
        await session.sendMsg(template('daemon.restarting')).catch(noop)
        process.exit(51)
    })
plugin.app.on('start', () => {
    process.send({type: 'start', body: {autoRestart}})
    process.on('SIGINT', handleSignal)
    process.on('SIGTERM', handleSignal)
})

interface Message {
    type: 'send'
    body: any
}
process.on('message', (data: Message) => {
    if (data.type === 'send') {
        const {channelId, sid, message} = data.body
        const bot = plugin.app.bots.find(bot=>bot.sid===sid)
        if (bot && bot.isOnline()) {
            bot.sendMsg(channelId, message)
        } else {
            const dispose = plugin.on('oicq.system.online', (session) => {
                const bot: Bot = session.bot
                if (bot.uin !== sid) return
                bot.sendMsg(channelId, message)
                dispose()
            })
        }
    }
})

export interface DaemonConfig {
    autoRestart?: boolean
    exitCommand?: string|boolean
}
