import { Bot, Plugin } from 'oitq'
import { Loader } from '@oitq/cli'

declare module '@oitq/plugin-console' {
    interface Events {
        'manager/app-reload'(config: any): void
        'manager/plugin-reload'(name: string, config: any): void
        'manager/plugin-unload'(name: string, config: any): void
        'manager/bot-update'(config: Bot.Config): void
        'manager/bot-add'(config:Bot.Config):void
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

        ctx.console.addListener('manager/bot-add', (config) => {
            this.addBot(config)
        }, { authority: 4 })
        ctx.console.addListener('manager/bot-update', (config) => {
            this.updateBot(config)
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
    addBot(config:Bot.Config){
        if(this.ctx.bots.get(config.uin)) return this.updateBot(config)
        this.loader.config.bots.push(config)
        this.loader.writeConfig()
    }
    updateBot(config: Bot.Config) {
        let bot: Bot = this.ctx.bots.find(bot => bot.uin === config.uin)
        if(!bot)return
        const index=this.loader.config.bots.findIndex(c=>c.uin===config.uin)
        if(index>=0)this.loader.config.bots.splice(index,1)
        this.loader.config.bots.push(config)
        this.loader.writeConfig()
    }

    removeBot(uin: number) {
        const bot=this.ctx.bots.get(uin)
        if(!bot)return;
        const index=this.loader.config.bots.findIndex(c=>c.uin===uin)
        if(index>=0)this.loader.config.bots.splice(index,1)
        this.loader.writeConfig()
        return
    }
}
