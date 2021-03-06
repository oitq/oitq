import {merge, Dict} from "@oitq/utils";
import {Plugin, PluginManager} from './plugin'
import {Adapter} from "./adapter";
import {Bot} from "./bot";
import {defaultAppConfig} from './static'
import {Middleware,ChannelId,MsgChannelId} from "./types";
import {Command} from "./command";
import ConfigLoader from "@oitq/loader";
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "mark" | "off";
export class App extends Plugin{
    public app=this
    public parent=this
    middlewares: Middleware[] = []
    _commands:Map<string,Command>=new Map<string, Command>()
    public commandList:Command[]=[]
    constructor(public config:App.Config) {
        super({install(){},name:'app'});
        this.logger=this.getLogger('app')
        this.bots=new Adapter.BotList(this)
        this.pluginManager=new PluginManager(this)
    }

    async broadcast(msgChannelIds:MsgChannelId|MsgChannelId[],msg:string){
        msgChannelIds=[].concat(msgChannelIds)
        for(const msgChannelId of msgChannelIds){
            const [_,uin,target_type,target_id]=/^(\d+)-(\S+):(\d+)$/.exec(msgChannelId)
            await this.bots.get(uin).sendMsg(`${target_type}:${target_id}` as ChannelId,msg)
        }
    }
    addBot(config:Bot.Config){
        return this.bots.create(config.platform,config)
    }
    removeBot(uin:string){
        return this.bots.remove(uin)
    }
    async start(){
        await this.pluginManager.init()
        await this.parallel('before-start')
        this.emit('ready')
    }
}
export namespace App{
    export interface Config extends PluginManager.Config{
        bots:Bot.Config[]
        delay?:Dict<number>
        token?:string
        logLevel?:LogLevel
        maxListeners?:number,
    }
}
export function createApp(config?:string|App.Config){
    if(!config || typeof config==='string'){
        config=new ConfigLoader<App.Config>(config as string).readConfig()
    }
    return new App(merge(defaultAppConfig,config))
}
export function defineConfig(config:App.Config){
    return config
}
