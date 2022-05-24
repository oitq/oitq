import {Plugin, Dict, omit, pick, Time, Bot} from "oitq";
import {DataService} from "@oitq/plugin-console";
declare module 'oitq'{
    interface Bot{
        _messageSent: TickCounter
        _messageReceived: TickCounter
    }
}
class TickCounter{
    public stop: () => void

    private data = new Array(60).fill(0)

    private tick = () => {
        this.data.unshift(0)
        this.data.splice(-1, 1)
    }

    constructor(plugin: Plugin) {
        const timer=setInterval(()=>this.tick(),Time.second)
        const dispose=()=>{
            clearInterval(timer)
            return true
        }
        plugin.disposes.push(this.stop=dispose)
    }

    public add(value = 1) {
        this.data[0] += value
    }

    public get() {
        return this.data.reduce((prev, curr) => prev + curr, 0)
    }
}
class BotProvider extends DataService<Dict<BotProvider.Data>> {
    callbacks: BotProvider.Extension[] = []

    constructor(plugin: Plugin) {
        super(plugin, 'bots', { authority: 4 })

        plugin.before('send', (session) => {
            session.bot._messageSent.add(1)
        })

        plugin.on('bot.message', (session) => {
            session.bot._messageReceived.add(1)
        })

        plugin.bots.forEach(bot => BotProvider.initialize(bot, plugin))

        plugin.on('bot-add', (bot) => {
            BotProvider.initialize(bot, plugin)
            process.nextTick(() => this.refresh())
        })

        plugin.on('bot-remove', (bot) => {
            process.nextTick(() => this.refresh())
            bot._messageSent.stop()
            bot._messageReceived.stop()
        })

        plugin.on('bot.system.online', () => {
            this.refresh()
        })
        plugin.on('bot.system.offline', () => {
            this.refresh()
        })

        this.extend((bot) => {
            const config = this.plugin.app.config.bots[bot.app.bots.indexOf(bot)]
            return {
                ...pick(bot, ['uin', 'nickname', 'status']),
                ...pick(config['config'], ['platform']),
                config: pick(config, ['type', 'admins', 'master']),
                messageSent: bot._messageSent.get(),
                messageReceived: bot._messageReceived.get(),
            }
        })
    }

    extend(callback: BotProvider.Extension) {
        this.callbacks.push(callback)
    }

    async get() {
        return Object.fromEntries(this.plugin.bots.map((bot) => {
            return [bot.uin, Object.assign({}, ...this.callbacks.map(cb => cb(bot)))] as [number, BotProvider.Data]
        }))
    }
}
namespace BotProvider{
    export function initialize(bot: Bot, plugin: Plugin) {
        bot._messageSent = new TickCounter(plugin)
        bot._messageReceived = new TickCounter(plugin)
    }

    export type Extension = (bot: Bot) => Partial<Data>

    export interface Data extends
        Pick<Bot.Config['config'],'platform'>,
        Pick<Bot, 'uin' | 'nickname' | 'status'> {
        config:Pick<Bot.Config, 'type'|'admins'|'master'>,
        messageSent: number
        messageReceived: number
    }
}
export default BotProvider
