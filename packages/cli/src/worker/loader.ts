import {App, Dict, interpolate, valueMap } from 'oitq'
import ConfigLoader from '@oitq/loader'
import ns from 'ns-require'

declare module 'oitq' {
    namespace App {
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
    envfile: string
    scope: ns.Scope

    constructor() {
        super(process.env.OITQ_CONFIG_FILE)
        this.scope = ns({
            namespace: 'oitq',
            prefix: 'plugin',
            official: 'oitq',
            dirname: this.dirname,
        })
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

    resolvePlugin(name: string) {
        try {
            this.cache[name] ||= this.scope.resolve(name)
        } catch (err) {
            return
        }
        return ns.unwrapExports(require(this.cache[name]))
    }

    destroyPlugin(name: string) {
        return this.app.pluginManager.destroy(name)
    }

    reloadPlugin(name: string) {
        return this.app.pluginManager.restart(name)
    }

    createApp() {
        this.app=new App(this.config)
        this.app.loader=this
        return this.app
    }

    fullReload() {
        console.info('trigger full reload')
        process.exit(51)
    }
}
