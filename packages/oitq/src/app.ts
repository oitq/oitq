import 'oicq2-cq-enable';
import {LogLevel, Sendable} from "oicq";
import {BotList, Bot, ChannelId} from "./bot";
import {sleep, merge, Dict, Awaitable, readConfig, createIfNotExist} from "@oitq/utils";
import {MsgChannelId} from './context'
import {Plugin, PluginManager} from './plugin'
import {Computed} from "./session";
import {defaultAppConfig, dir} from './static'
import * as path from "path";
export namespace App{
    export interface Config extends PluginManager.Config{
        start?:boolean,
        prefix?: Computed<string | string[]>
        minSimilarity?:number,
        bots?:Bot.Config[]
        plugins?:Record<string, any>
        delay?:Dict<number>
        token?:string
        dir?:string
        logLevel?:LogLevel
        maxListeners?:number,
    }
    export interface Services{
        pluginManager:PluginManager
        bots:BotList
    }
}
export interface App extends App.Services{
    start(...args:any[]):Awaitable<void>
}
export class App extends Plugin{
    public app=this
    public config:App.Config={logLevel:process.env.OITQ_LOG_LEVEL as LogLevel||'info'}
    constructor(config:App.Config|string=path.join(dir,'oitq.json')) {
        super({install(){},name:'app'});
        this.logger=this.getLogger('app')
        if(typeof config==='string'){
            createIfNotExist(config,defaultAppConfig)
            try{
                config=readConfig(config) as App.Config
            }catch {
                config={}
            }
        }
        this.config=merge(defaultAppConfig,config)
        this.bots=new BotList(this)
        this.pluginManager=new PluginManager(this,this.config.plugin_dir)
        this.pluginManager.init(this.config.plugins)
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
        if(this.config.bots){
            for(const config of this.config.bots){
                this.bots.create(config)
            }
        }
        for(const bot of this.bots){
            const config=this.config.bots||=[]
            const option:Bot.Config=config.find(botOption=>botOption.uin===bot.uin) ||{} as any
            await bot.login(option.password)
            await sleep(3000)//避免同一设备同时多个bot登录异常，做延时
        }
        this.emit('ready')
    }
}
export const getAppConfigPath=(baseDir=process.cwd())=>path.join(baseDir,'oitq.config.json')
export const getBotConfigPath=(baseDir=process.cwd())=>path.join(baseDir,'bot.default.json')
export function createApp(config:string|App.Config=getAppConfigPath(dir)){
    return new App(config)
}
export function defineConfig(config:App.Config){
    return config
}
