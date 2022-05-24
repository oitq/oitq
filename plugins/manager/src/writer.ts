import { Bot, Plugin } from 'oitq'
import { Loader } from '@oitq/cli'

declare module '@oitq/plugin-console' {
    interface Events {
        'manager/app-reload'(config: any): void
        'manager/plugin-reload'(name: string, config: any): void
        'manager/plugin-unload'(name: string, config: any): void
        'manager/bot-update'(uin: number,  config: any): void
        'manager/bot-remove'(uin: number): void
    }
}

export default class ConfigWriter {
    private loader: Loader
    private plugins: {}
    static using=['CLI'] as const
    constructor(private ctx: Plugin) {
        this.loader = ctx.loader
        this.plugins = ctx.app.config.plugins

        ctx.console.addListener('manager/app-reload', (config) => {
            this.reloadApp(config)
        }, { authority: 4 })

        ctx.console.addListener('manager/plugin-reload', (name, config) => {
            this.reloadPlugin(name, config)
        }, { authority: 4 })

        ctx.console.addListener('manager/plugin-unload', (name, config) => {
            this.unloadPlugin(name, config)
        }, { authority: 4 })

        ctx.console.addListener('manager/bot-update', (id, config) => {
            this.updateBot(id, config)
        }, { authority: 4 })

        ctx.console.addListener('manager/bot-remove', (id) => {
            this.removeBot(id)
        }, { authority: 4 })
    }

    reloadApp(config: any) {
        this.loader.config = config
        this.loader.config.plugins = this.plugins
        this.loader.writeConfig()
        this.loader.fullReload()
    }

    reloadPlugin(name: string, config: any) {
        delete this.plugins['~' + name]
        this.plugins[name] = config
        this.loader.writeConfig()
        this.loader.reloadPlugin(name)
    }

    unloadPlugin(name: string, config: any) {
        delete this.plugins[name]
        this.plugins['~' + name] = config
        this.loader.writeConfig()
        this.loader.unloadPlugin(name)
    }

    updateBot(uin: number,config: any) {
        let bot: Bot
        if (uin) {
            bot = this.ctx.bots.find(bot => bot.uin === uin)
            const index = bot.app.bots.indexOf(bot)
            this.ctx.bots[index] = config
        }
        this.loader.writeConfig()
    }

    removeBot(uin: number) {
        this.ctx.bots.remove(uin)
        return
    }
}
