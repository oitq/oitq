import {LogLevel} from "oicq";
import {BotList, BotOptions} from "./bot";
import {sleep, merge, Dict, Awaitable, readConfig, createIfNotExist} from "@oitq/utils";
import {Context} from './context'
import {PluginManager} from './plugin'
import {Computed} from "./session";
import {defaultAppOptions, dir} from './static'
import {Command} from "@lc-cn/command";
import * as path from "path";

interface KoaOptions{
    env?: string
    keys?: string[]
    proxy?: boolean
    subdomainOffset?: number
    proxyIpHeader?: string
    maxIpsCount?: number
}

export interface AppOptions extends KoaOptions,PluginManager.Config{
    start?:boolean,
    prefix?: Computed<string | string[]>
    minSimilarity?:number,
    bots?:BotOptions[]
    delay?:Dict<number>
    token?:string
    plugin_dir?:string
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
    options:AppOptions
    constructor(options:AppOptions|string=path.join(dir,'oitq.json')) {
        super(()=>true);
        if(typeof options==='string'){
            createIfNotExist(options,defaultAppOptions)
            try{
                options=readConfig(options) as AppOptions
            }catch {
                options={}
            }
        }
        this.options=merge(defaultAppOptions,options)
        this.bots=new BotList(this)
        this.pluginManager=new PluginManager(this,this.options)
        this.pluginManager.init()
        this.prepare()
        this._commands.resolve = (key) => {
            if (!key) return
            const segments = key.split('.')
            let i = 1, name = segments[0], cmd: Command
            while ((cmd = this.getCommand(name)) && i < segments.length) {
                name = cmd.name + '.' + segments[i++]
            }
            return cmd
        }
        if(options.bots){
            for(const botOptions of options.bots){
                this.addBot(botOptions)
            }
        }
    }

    getCommand(name: string) {
        return this._commands.get(name)
    }
    prepare(){

    }
    addBot(options:BotOptions){
        this.options.bots.push(options)
        const bot=this.bots.create(options)
        if(this.status) {
            bot.login(options.password)
        }
        return bot
    }
    async removeBot(uin:number){
        return await this.bots.remove(uin)
    }
    async start(){
        for(const bot of this.bots){
            const botOptions=this.options.bots||=[]
            const option:BotOptions=botOptions.find(botOption=>botOption.uin===bot.uin) ||{} as any
            await bot.login(option.password)
            await this.pluginManager.restore(bot)
            await sleep(3000)//避免同一设备同时多个bot登录异常，做延时
        }
        this.status=true
        this.emit('ready')
    }
}
