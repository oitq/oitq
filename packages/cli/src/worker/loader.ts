import {Plugin,App, Dict, interpolate, valueMap } from 'oitq'
import {resolve} from "path";
import * as dotenv from 'dotenv'
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
    envfile: string
    cache: Dict<string> = {}

    constructor() {
        super(process.env.OITQ_CONFIG_FILE)
        this.envfile = resolve(this.dirname, '.env')
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
    readConfig(): App.Config {
        // load .env file into process.env
        dotenv.config({ path: this.envfile })
        return this.interpolate(super.readConfig())
    }
    writeConfig() {
        // prevent hot reload when it's being written
        if (this.app.watcher) this.app.watcher.suspend = true
        super.writeConfig()
    }
    loadPlugin(name:string,config?:any){
        return this.app.plugin(name,this.interpolate(config))
    }
    destroyPlugin(name: string) {
        return this.app.pluginManager.destroy(name)
    }

    reloadPlugin(name: string) {
        const plugin = this.app.pluginManager.plugins.get(name)
        if (!plugin) return
        plugin.dispose()
        const config = this.config.plugins[name]
        return plugin.install(this.interpolate(config))
    }
    unloadPlugin(name: string) {
        const plugin = this.app.pluginManager.plugins.get(name)
        if (!plugin) return

        plugin.dispose()

    }

    createApp() {
        this.app=new App(this.interpolate(this.config))
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
