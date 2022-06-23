import {Bot} from "./bot";
import {Plugin, PluginManager} from "./plugin";
import {Awaitable,remove} from "@oitq/utils";
import {NSession} from "./types";
import {App} from "./app";

export abstract class Adapter<S extends Bot.BaseConfig=Bot.BaseConfig,T={}>{
    public app:App
    public bots:Bot<S>[]=[]
    protected abstract start(): Awaitable<void>
    protected abstract stop(): Awaitable<void>
    constructor(public platform:keyof Bot.Platforms,public plugin:Plugin,public config:T) {
        this.app=plugin.app
        plugin.app.on('ready',()=>this.start())
        plugin.app.on('dispose',()=>this.stop())
    }
    startBot(bot: Bot): Awaitable<void> {}
    stopBot(bot: Bot): Awaitable<void> {}
    dispatch(session:NSession<any>){
        this.plugin.dispatch(session.event_name,session)
    }
}
export namespace Adapter{
    export interface Constructor<T extends Bot.BaseConfig=Bot.BaseConfig,S=any>{
        new(plugin:Plugin,options:S):Adapter<T>
    }
    export const library: Record<string, Constructor>={}
    export const configMap: Record<string, any> = {}
    export type BotConfig<R> = R & { bots?: R[] }
    export type PluginConfig<S = any, R = any> = S & BotConfig<R>
    export function define<T extends Bot.BaseConfig, S>(
        platform: keyof Bot.Platforms,
        constructor: Bot.Constructor<T>,
        adapter: Constructor<T, S>,
    ): PluginManager.ObjectHook<PluginConfig<S, T>>{
        const name = platform + '-adapter'
        Bot.library[platform] = constructor
        Adapter.library[platform]=adapter
        function install(plugin:Plugin,config?){
            plugin.emit('adapter', platform)
            configMap[platform] = config
            const bots=plugin.app.config.bots.filter(bot=>bot.platform===platform)
            if(config&&config.bots)bots.push(...config.bots)
            for (const options of bots) {
                plugin.bots.create(platform, options, constructor)
            }
        }
        return {name,install}
    }
    export class BotList extends Array<Bot> {
        adapters: Record<string,Adapter> = {}
        name:string='bots'
        constructor(private app: App) {
            super()
        }

        get(sid: string) {
            return this.find(bot => bot.sid === sid)
        }

        create<T extends Bot>(platform: keyof Bot.Platforms, options: Bot.Config, constructor?: new (adapter: Adapter, config: any) => T): T {
            constructor ||= Bot.library[platform] as any
            const adapter = this.resolve(platform)
            const bot = new constructor(adapter, options)
            adapter.bots.push(bot)
            this.push(bot)
            this.app.emit('bot-add', bot)
            this.app.on('dispose', () => {
                this.remove(bot.sid)
            })
            return bot
        }

        remove(sid: string) {
            const index = this.findIndex(bot => bot.sid === sid)
            if (index < 0) return
            const [bot] = this.splice(index, 1)
            const exist = remove(bot.adapter.bots, bot)
            this.app.emit('bot-remove', bot)
            return exist
        }

        private resolve(platform: keyof Bot.Platforms): Adapter {
            if (this.adapters[platform]) return this.adapters[platform]

            const constructor = Adapter.library[platform]
            if (!constructor) {
                throw new Error(`unsupported protocol "${platform}"`)
            }

            const adapter = new constructor(this.app, configMap[platform])
            adapter.platform = platform
            this.app.on('dispose', () => {
                delete this.adapters[platform]
            })
            return this.adapters[platform] = adapter
        }
    }
}
