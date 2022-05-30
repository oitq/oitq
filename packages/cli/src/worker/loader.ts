import {Plugin,App, Dict, interpolate, valueMap } from 'oitq'
import ConfigLoader from '@oitq/loader'

declare module 'oitq' {
    namespace Plugin {
        interface Services {
            loader: Loader
        }
    }
}
const context = {
    env: process.env,
}
export class Loader extends ConfigLoader<App.Config> {
    app: App
    config:App.Config
    cache: Dict<string> = {}

    constructor() {
        super(process.env.OITQ_CONFIG_FILE)
        this.readConfig()
    }

    interpolate(source: any) {
        if (typeof source === 'string') {
            return interpolate(source, context, /\$\{\{(.+?)\}\}/g)
        } else if (!source || typeof source !== 'object') {
            return source
        } else if (Array.isArray(source)) {
            return source.map(item => this.interpolate(item))
        } else {
            return valueMap(source, item => this.interpolate(item))
        }
    }

    loadPlugin(name:string,config?:any){
        return this.app.plugin(name,config)
    }
    destroyPlugin(name: string) {
        return this.app.pluginManager.destroy(name)
    }

    reloadPlugin(name: string) {
        const plugin = this.app.pluginManager.plugins.get(name)
        if (!plugin) return
        plugin.dispose()
        const config = this.config.plugins[name]
        return plugin.install(config)
    }
    unloadPlugin(name: string) {
        const plugin = this.app.pluginManager.plugins.get(name)
        if (!plugin) return

        plugin.dispose()

    }

    createApp() {
        this.app=new App(this.config)
        this.app.loader=this
        return this.app
    }

    fullReload() {
        console.info('trigger full reload')
        this.app.dispose()
        process.exit(51)
    }
}
Plugin.service('loader')
