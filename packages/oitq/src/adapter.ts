import {Base} from "./base";
import {App} from "./app";
import {OicqAdapter, OicqEventMap} from "./adapters";
import {Bot} from "./bot";
import {Dict, NSession} from "./types";
import {remove} from "./utils";
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
