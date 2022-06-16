import 'oicq2-cq-enable';
import {LogLevel, Sendable} from "oicq";
import {BotList, Bot} from "./bot";
import {sleep, merge, Dict, readConfig, createIfNotExist} from "@oitq/utils";
import {Plugin, PluginManager} from './plugin'
import {defaultAppConfig, dir} from './static'
import * as path from "path";
import {Middleware,ChannelId,MsgChannelId} from "./types";
import {Command} from "./command";
import ConfigLoader from "@oitq/loader";
export class App extends Plugin{
    public app=this
    public parent=this
    middlewares: Middleware[] = []
    _commands:Map<string,Command>=new Map<string, Command>()
    public commandList:Command[]=[]
    constructor(public config:App.Config) {
        super({install(){},name:'app'});
        this.logger=this.getLogger('app')
        this.bots=new BotList(this)
        this.pluginManager=new PluginManager(this)
    }

    async broadcast(msgChannelIds:MsgChannelId|MsgChannelId[],msg:Sendable){
        msgChannelIds=[].concat(msgChannelIds)
        for(const msgChannelId of msgChannelIds){
            const [_,uin,target_type,target_id]=/^(\d+)-(\S+):(\d+)$/.exec(msgChannelId)
            await this.bots.get(Number(uin)).sendMsg(`${target_type}:${target_id}` as ChannelId,msg)
        }
    }
    addBot(config:Bot.Config){
        return this.bots.create(config)
    }
    removeBot(uin:number){
        return this.bots.remove(uin)
    }
    async start(){
        await this.pluginManager.init()
        await this.parallel('before-start')
        if(this.config.bots){
            for(const config of this.config.bots){
                this.bots.create(config)
            }
        }
        for(const bot of this.bots){
            await bot.login(bot.options.password)
            await sleep(3000)//避免同一设备同时多个bot登录异常，做延时
        }
        this.emit('ready')
    }
}
export namespace App{
    export interface Config extends PluginManager.Config{
        bots?:Bot.Config[]
        delay?:Dict<number>
        token?:string
        logLevel?:LogLevel
        maxListeners?:number,
    }
}
export function createApp(config?:string|App.Config){
    if(!config || typeof config==='string'){
        config=new ConfigLoader(config as string).readConfig()
    }
    return new App(merge(defaultAppConfig,config))
}
export function defineConfig(config:App.Config){
    return config
}
