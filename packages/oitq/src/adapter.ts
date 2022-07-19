import {Base} from "./base";
import {App} from "./app";
import {OicqAdapter, OicqEventMap} from "./adapters/oicq/";
import {Bot} from "./bot";
import {Dict} from "./types";
import {remove} from "./utils";
import {Session} from "./session";
export interface BotEventMap extends OicqEventMap{
}
export class Adapter<I extends Bot=Bot> extends Base{
    bots:Adapter.BotList<I>
    config:{bots:Bot[]}
    Constructor:new (adapter:Adapter<I>,options:Dict)=>I
    constructor(public name:string,fullPath:string) {
        super('adapter',name,fullPath)
        this.app.adapters[name]=this
        this.bots=new Adapter.BotList<I>(this)
        const config=this.config
        this.on('start',()=>{
            for(const bot of this.bots){
                bot.start()
            }
        })

        this.on('dispose',()=>{
            for(const bot of this.bots){
                bot.stop()
            }
        })

    }
    create<O extends Dict>(options:O):I{
        if(!this.Constructor) throw new Error('请先配置实例构造函数')
        return this.bots.create(options)
    }
    dispatch<K extends keyof BotEventMap>(this:I,event:K,...args:Parameters<BotEventMap[K]>){
        const session=new Session(this.app,this.adapter,this,event,args)
        if(/^.*message$/.test(event)){
            this.app.emit('message',session)
        }else{
            this.app.emit(event,session)

        }
        for(const plugin of Object.values(this.app.plugins)){
            plugin.emit(event,...[session] as Parameters<BotEventMap[K]>)
        }
    }
}
export namespace Adapter{
    export class BotList<I extends Bot> extends Array<I> {
        name:string='bots'
        private app:App
        constructor(public adapter:Adapter<I>,bots:I[]=[]) {
            super(...bots)
            this.app=adapter.app
        }

        get(sid: string) {
            return this.find(bot => bot.sid === sid)
        }

        create(options:Dict) {
            const bot=new this.adapter.Constructor(this.adapter,options)
            this.push(bot)
            this.app.emit('bot-add', bot)
            this.adapter.on('dispose', () => {
                this.remove(bot.sid)
            })
            return bot
        }

        remove(sid: string) {
            const index = this.findIndex(bot => bot.sid === sid)
            if (index < 0) return
            const [bot] = this.splice(index, 1)
            const exist = remove(this, bot)
            this.app.emit('bot-remove', bot)
            return exist
        }

    }
}
export namespace Adapter{
    export interface Config{
        oicq:OicqAdapter.Config
    }
}
