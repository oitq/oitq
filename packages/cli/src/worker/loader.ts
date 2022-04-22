import { App, Context, Dict, interpolate, valueMap,AppOptions } from 'oitq'
import ConfigLoader from '@oitq/loader'
import ns from 'ns-require'

declare module 'oitq' {
    namespace Context {
        interface Services {
            loader: Loader
        }
    }
}

Context.service('loader')



const context = {
    env: process.env,
}
export class Loader extends ConfigLoader<AppOptions> {
    app: App
    config:AppOptions
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

    unloadPlugin(name: string) {
        return this.app.pluginManager.uninstall(name)
    }

    reloadPlugin(name: string) {
        const plugin = this.resolvePlugin(name)
        if (!plugin) return
        const config = this.config.plugins[name]
        this.app.plugin(plugin, this.interpolate(config))
    }

    createApp() {
        return this.app = new App(this.config)
    }

    fullReload() {
        console.info('trigger full reload')
        process.exit(51)
    }
}
