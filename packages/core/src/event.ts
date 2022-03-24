import {App} from "./app";
import {Context} from "./context";
import {isBailed, remove} from "@oitq/utils";
export type EventName=string|symbol
export class Events{
    _hooks: Record<keyof any, [App|Context, (...args: any[]) => any][]> = {}
    private static metaWords='./-'.split('')
    constructor(public app?:App) {}
    private getListeners(name:EventName){
        if(typeof name === "symbol") return this.app._hooks[name]||=[]
        return Object.keys(this.app._hooks)
            .filter(key=>{
                return new RegExp(Events.createRegStr(name)).test(key) || new RegExp(Events.createRegStr(key)).test(name)
            })
            .map(key=>this.app._hooks[key])
            .flat()
    }
    private static createRegStr(name:string):string{
        name=`^${name}$`
        for (const word of this.metaWords){
            name=name.replace(word,`\\${word}`)
        }
        return name.replace('*','.*')
    }
    async parallel<K extends EventName>(name: K, ...args: any[]): Promise<void>
    async parallel<K extends EventName>(target:any,name:K,...args:any[]):Promise<void>
    async parallel(...args: any[]) {
        const tasks: Promise<any>[] = []
        const session = typeof args[0] === 'object' ? args.shift() : null
        const name = args.shift()
        const hooks=this.getListeners(name)
        for (let [context, callback] of hooks) {
            if (!context.match(session)) continue
            tasks.push((async () => {
                return callback.apply(session, args)
            })().catch(((error) => {
                this.app.logger('app').warn(error)
            })))
        }
        await Promise.all(tasks)
    }
    emit<K extends EventName>(name: K, ...args: any[]): void
    emit<K extends EventName>(target: any, name: K, ...args: any[]): void
    emit(...args: [any, ...any[]]) {
        this.parallel(...args)
    }
    waterfall<K extends EventName>(name: K, ...args: any[]): Promise<any>
    waterfall<K extends EventName>(target: any, name: K, ...args: any[]): Promise<any>
    async waterfall(...args: [any, ...any[]]) {
        const session = typeof args[0] === 'object' ? args.shift() : null
        const name = args.shift()
        for (let [context, callback] of this.getListeners(name)) {
            if (!context.match(session)) continue
            args[0] = await callback.apply(session, args)
        }
        return args[0]
    }
    chain<K extends EventName>(name: K, ...args: any[]): any
    chain<K extends EventName>(target: any, name: K, ...args: any[]): any
    chain(...args: [any, ...any[]]) {
        return this.waterfall(...args)
    }
    serial<K extends EventName>(name: K, ...args: any[]):Promise<any>
    serial<K extends EventName>(target: any, name: K, ...args: any[]): Promise<any>
    async serial(...args: [any,...any]) {
        const session = typeof args[0] === 'object' ? args.shift() : null
        const name = args.shift()
        for (let [context, callback] of this.getListeners(name)) {
            if (!context.match(session)) continue
            const result = await callback.apply(session, args)
            if (isBailed(result)) return result
        }
    }

    bail<K extends EventName>(name: K, ...args: any[]):any
    bail<K extends EventName>(target: any, name: K, ...args: any[]): any
    bail(...args: [any,...any[]]) {
        return this.serial(...args)
    }
    on<K extends EventName>(name: K, listener: (...args:any[])=>void, prepend?: boolean): () => boolean
    on(name: EventName, listener: (...args:any[])=>void, prepend = false):() => boolean {
        const method = prepend ? 'unshift' : 'push'

        // handle special events
        if (name === 'connect' && this.app.status) {
            return listener(), () => false
        }

        const hooks = this.app._hooks[name]||=[]
        if (hooks.length >= this.app.options.maxListeners) {
            this.app.logger('app').warn(
                'max listener count (%d) for event "%s" exceeded, which may be caused by a memory leak',
                this.app.options.maxListeners, name,
            )
        }

        // @ts-ignore
        hooks[method]([this, listener])
        const dispose = () => {
            return this.off(name, listener)
        }
        return dispose
    }

    before<K extends string>(name: K, listener: (...args:any)=>void, append = false) {
        const seg = name.split('/')
        seg[seg.length - 1] = 'before-' + seg[seg.length - 1]
        return this.on(seg.join('/') as EventName, listener, !append)
    }

    once(name: EventName, listener: (...args:any[])=>void, prepend = false) {
        const dispose = this.on(name, function (...args: any[]) {
            dispose()
            return listener.apply(this, args)
        }, prepend)
        return dispose
    }

    off<K extends EventName>(name: K, listener: (...args:any[])=>void) {
        // @ts-ignore
        const index = (this.app._hooks[name] || []).findIndex(([context, callback]) => context === this && callback === listener)
        if (index >= 0) {
            this.app._hooks[name].splice(index, 1)
            return true
        }
    }
}
