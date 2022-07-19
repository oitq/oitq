import {Awaitable} from "./types";
import {remove} from "./utils";

export type EventName=string
export type EventListener=(...args:any[])=>Awaitable<any>
export class Event {
    private _events:Record<EventName, EventListener[]>={}
    private static metaWords='./-'.split('')
    private _maxListenerCount:number=15
    constructor() {}
    private getListeners(name:EventName){
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
    async parallel(name: string, ...args: any[]): Promise<void>{
        const tasks: Promise<any>[] = []
        const listeners=this.getListeners(name)
        for (let listener of listeners) {
            tasks.push((async () => {
                return listener.apply(this, args)
            })())
        }
        await Promise.all(tasks)
    }
    emit(name: string, ...args: any[]): void {
        this.parallel(name,...args)
    }
    async bail(name:string,...args:any[]):Promise<string|boolean|void>{
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
    on(name: string, listener: (...args:any[])=>void, prepend?: boolean): () => boolean{
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
    before(name: string, listener: (...args:any)=>void, append = false) {
        return this.on(`before-${name}`, listener, !append)
    }

    off(name: string, listener: (...args:any[])=>void) {
        return remove(this._events[name]||[],listener)
    }
}
