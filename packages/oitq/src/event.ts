import {Awaitable, OitqEventMap} from "./types";
import {remove} from "./utils";
type Dispose=()=>boolean
export interface Event{
    parallel<K extends keyof OitqEventMap>(name: K, ...args: Parameters<OitqEventMap[K]>): Promise<void>
    parallel<S extends string>(name:S & Exclude<S, keyof OitqEventMap>,...args:any[]):Promise<void>
    emit<K extends keyof OitqEventMap>(name: K, ...args: Parameters<OitqEventMap[K]>): void
    emit<S extends string>(name:S & Exclude<S, keyof OitqEventMap>,...args:any[]):void
    bail<K extends keyof OitqEventMap>(name: K, ...args: Parameters<OitqEventMap[K]>): Promise<any|void>
    bail<S extends string>(name:S & Exclude<S, keyof OitqEventMap>,...args:any[]):Promise<any|void>
    on<K extends keyof OitqEventMap>(name:K,listener:OitqEventMap[K],prepend?:boolean):Dispose
    on<S extends string>(name:S & Exclude<S, keyof OitqEventMap>,listener:Function,prepend?:boolean):Dispose
    before<K extends keyof OitqEventMap>(name:K,listener:OitqEventMap[K],append?:boolean):Dispose
    before<S extends string>(name:S & Exclude<S, keyof OitqEventMap>,listener:Function,append?:boolean):Dispose
    off<K extends keyof OitqEventMap>(name:K,listener:OitqEventMap[K]):boolean
    off<S extends string>(name:S & Exclude<S, keyof OitqEventMap>,listener:Function):boolean
}
export class Event {
    private _events:Record<string, Function[]>={}
    private static metaWords='./-'.split('')
    private _maxListenerCount:number=15
    constructor() {}
    private getListeners(name:string){
        return Object.keys(this._events)
            .filter(key=>{
                return Event.createRegStr(name).test(key) || Event.createRegStr(key).test(name)
            })
            .map(key=>this._events[key])
            .flat()
    }
    get maxListener(){
        return this._maxListenerCount
    }
    setMaxListener(n:number){
        this._maxListenerCount=n
    }
    private static createRegStr(name:string):RegExp{
        name=`^${name}$`
        for (const word of this.metaWords){
            name=name.replace(word,`\\${word}`)
        }
        return new RegExp(name.replace('*','.*'))
    }
    async parallel(name,...args){
        const tasks: Promise<any>[] = []
        const listeners=this.getListeners(name)
        for (let listener of listeners) {
            tasks.push((async () => {
                return listener.apply(this, args)
            })())
        }
        await Promise.all(tasks)
    }
    emit(name,...args){
        this.parallel(name,...args)
    }
    async bail(name,...args){
        const listeners=this.getListeners(name)
        try{
            for(const listener of listeners){
                const result=await listener.apply(this,args)
                if(result)return result
            }
        }catch (e){
            return e.message
        }
    }
    on(name, listener, prepend?: boolean): () => boolean{
        const method = prepend ? 'unshift' : 'push'
        const listeners = this._events[name]||=[]
        if (listeners.length >= this.maxListener) {
            console.warn(
                'max listener count (%d) for event "%s" exceeded, which may be caused by a memory leak',
                this.maxListener, name,
            )
        }

        listeners[method](listener)
        return () => {
            return this.off(name, listener)
        }
    }
    before(name, listener, append = false) {
        return this.on(`before-${name}`, listener, !append)
    }

    off(name, listener) {
        return remove(this._events[name]||[],listener)
    }
}
