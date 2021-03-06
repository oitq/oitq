import {Awaitable, remove} from "@oitq/utils";
import {Logger} from 'log4js'
export type EventName=string
export type EventListener=(...args:any[])=>Awaitable<any>

export class EventThrower{
    private _events:Record<EventName, EventListener[]>={}
    private static metaWords='./-'.split('')
    private _maxListenerCount:number=15
    public logger:Logger
    constructor() {}
    private getListeners(name:EventName){
        return Object.keys(this._events)
            .filter(key=>{
                return EventThrower.createRegStr(name).test(key) || EventThrower.createRegStr(key).test(name)
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
    async parallel<K extends EventName>(name: K, ...args: any[]): Promise<void>{
        const tasks: Promise<any>[] = []
        const listeners=this.getListeners(name)
        for (let listener of listeners) {
            tasks.push((async () => {
                return listener.apply(this, args)
            })().catch(((error) => {
                this.logger.warn(error)
            })))
        }
        await Promise.all(tasks)
    }
    emit<K extends EventName>(name: K, ...args: any[]): void {
        this.parallel(name,...args)
    }
    async bail<K extends EventName>(name:K,...args:any[]):Promise<string|boolean|void>{
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
    on<K extends EventName>(name: K, listener: (...args:any[])=>void, prepend?: boolean): () => boolean{
        const method = prepend ? 'unshift' : 'push'
        const listeners = this._events[name]||=[]
        if (listeners.length >= this.maxListener) {
            this.logger.warn(
                'max listener count (%d) for event "%s" exceeded, which may be caused by a memory leak',
                this.maxListener, name,
            )
        }

        listeners[method](listener)
        return () => {
            return this.off(name, listener)
        }
    }
    before<K extends string>(name: K, listener: (...args:any)=>void, append = false) {
        return this.on(`before-${name}`, listener, !append)
    }

    off<K extends EventName>(name: K, listener: (...args:any[])=>void) {
        return remove(this._events[name]||[],listener)
    }
}
