import { DataService } from '@oitq/service-console'
import { Plugin, Dict } from 'oitq'

class ServiceProvider extends DataService<Dict<string>> {
    private cache: Dict<string>

    constructor(ctx: Plugin) {
        super(ctx, 'services', { authority: 4 })

        ctx.on('service', () => this.refresh())
    }

    async get(forced = false) {
        if (!forced && this.cache) return this.cache
        this.cache = {}
        for (const name of Plugin.Services) {
            const value = this.plugin[name].name
            if (this.plugin[name]) this.cache[name] = value ?? null
        }
        return this.cache
    }
}

export default ServiceProvider
