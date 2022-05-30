import { Awaitable, Plugin, Service } from 'oitq'
import Console from './index'

export namespace DataService {
    export interface Options {
        authority?: number
    }
}

export abstract class DataService<T = never> extends Service {
    static define(name: keyof Console.Services) {
        if (Object.prototype.hasOwnProperty.call(Console.prototype, name)) return
        const key = `console.${name}`
        Object.defineProperty(Console.prototype, name, {
            get(this: Console) {
                return this.caller[key]
            },
            set(this: Console, value) {
                this.caller[key] = value
            },
        })
    }

    public get(forced?: boolean): Awaitable<T> {
        return null
    }

    constructor(protected plugin: Plugin, protected key: keyof Console.Services, public options: DataService.Options = {}) {
        super(plugin, `console.${key}`,true)
        DataService.define(key)
    }

    start() {
        this.refresh()
    }

    protected broadcast(type: string, value: any) {
        this.plugin.console?.ws.broadcast(type, { key: this.key, value }, this.options)
    }

    async refresh() {
        this.broadcast('data', await this.get(true))
    }

    patch(value: T) {
        this.broadcast('patch', value)
    }
}
