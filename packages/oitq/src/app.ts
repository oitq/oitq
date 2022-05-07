import {LogLevel} from "oicq";
import {BotList, BotConfig} from "./bot";
import {sleep, merge, Dict, Awaitable, readConfig, createIfNotExist} from "@oitq/utils";
import {Context} from './context'
import {Plugin, PluginManager} from './plugin'
import {Computed} from "./session";
import {defaultAppConfig, dir} from './static'
import {Command} from "@lc-cn/command";
import * as path from "path";



export interface AppConfig extends PluginManager.Config{
    start?:boolean,
    prefix?: Computed<string | string[]>
    minSimilarity?:number,
    bots?:BotConfig[]
    delay?:Dict<number>
    token?:string
    dir?:string
    logLevel?:LogLevel
    maxListeners?:number,
}


interface CommandMap extends Map<string, Command> {
    resolve(key: string): Command
}
export interface App{
    start(...args:any[]):Awaitable<void>
}
export class App extends Context{
    status:boolean=false
    _commandList: Command[] = []
    _commands: CommandMap = new Map<string, Command>() as never
    _shortcuts: Command.Shortcut[] = []
    public app:App=this
    public disposeState:Map<Plugin,Plugin.State>=new Map<Plugin, Plugin.State>()
    config:AppConfig
    constructor(config:AppConfig|string=path.join(dir,'oitq.json')) {
        super(()=>true);
        if(typeof config==='string'){
            createIfNotExist(config,defaultAppConfig)
            try{
                config=readConfig(config) as AppConfig
            }catch {
                config={}
            }
        }
        this.disposeState.set(null,{
            children:[],
            context:this,
            plugin:null,
            disposes:[]
        })
        this.config=merge(defaultAppConfig,config)
        this.bots=new BotList(this)
        this.pluginManager=new PluginManager(this,this.config)
        this.pluginManager.init()
        this._commands.resolve = (key) => {
            if (!key) return
            const segments = key.split('.')
            let i = 1, name = segments[0], cmd: Command
            while ((cmd = this.getCommand(name)) && i < segments.length) {
                name = cmd.name + '.' + segments[i++]
            }
            return cmd
        }
    }

    getCommand(name: string) {
        return this._commands.get(name)
    }
    addBot(config:BotConfig){
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
            const option:BotConfig=config.find(botOption=>botOption.uin===bot.uin) ||{} as any
            await bot.login(option.password)
            await this.pluginManager.restore(bot)
            await sleep(3000)//避免同一设备同时多个bot登录异常，做延时
        }
        this.status=true
        this.emit('ready')
    }
}
export const getAppConfigPath=(baseDir=process.cwd())=>path.join(baseDir,'oitq.config.json')
export const getBotConfigPath=(baseDir=process.cwd())=>path.join(baseDir,'bot.default.json')
export function createApp(config:string|AppConfig=getAppConfigPath(dir)){
    return new App(config)
}
export function defineConfig(config:AppConfig){
    return config
}
