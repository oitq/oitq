import 'oicq2-cq-enable'
import {Client, Config as Protocol, EventMap} from "oicq";
import {Adapter, App, Awaitable, Bot, ChannelId, deepClone, deepMerge, TargetType} from 'oitq'
import {join} from "path";
export class OicqBot extends Client implements Bot{
    sid: string;
    app: App;
    public master:number
    public admins:number[]=[]
    public options:OicqBot.Options
    constructor(public adapter:Adapter<OicqBot>,options:OicqBot.Options) {
        options=deepMerge(deepClone(OicqBot.defaultOptions),options)
        super(options.uin,options.protocol);
        this.options=options
        this.app=adapter.app
        this.sid=options.uin.toString()
    }
    isMaster(user_id:`${number}`|number){
        return Number(user_id)===this.master
    }
    isAdmin(user_id:`${number}`|number){
        return this.admins.includes(Number(user_id))
    }
    emit<E extends keyof EventMap>(name:E,...args:Parameters<EventMap[E]>){
        // @ts-ignore
        this.adapter.dispatch.call(this,...[name,...args])
        return super.emit(name,...args)
    }

    sendMsg(channelId: ChannelId, message: string) {
        const [targetType,targetId] = channelId.split(':') as [TargetType,`${number}`]
        switch (targetType){
            case "discuss":
                return this.sendDiscussMsg(Number(targetId),message)
            case "group":
                return this.sendGroupMsg(Number(targetId),message)
            case "private":
                return this.sendPrivateMsg(Number(targetId),message)
            default:
                throw new Error('无法识别的channelId:'+channelId)
        }
    }


    start(): Awaitable {
        this.login(this.options.password)
    }

    stop(): Awaitable {
        return this.logout();
    }
}
export namespace OicqBot{
    export interface Options {
        uin:number
        password?:string
        admins?:number[]
        master?:number
        protocol?:Protocol
    }
    export const defaultOptions:Partial<Options>={
        protocol:{
            platform:5,
            data_dir:join(process.cwd(),'data')
        }
    }
}
