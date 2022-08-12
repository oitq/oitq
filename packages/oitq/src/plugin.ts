import {Base} from "./base";
import {CronJob,CronCommand} from 'cron'
import {Event} from "./event";
import {Middleware, OitqEventMap, TargetType} from "./types";
import {Command} from "./command";
import {deepClone, deepMerge, remove} from "./utils";
import {Argv} from "./argv";
import {Watcher} from "./plugins/watcher";
import {DaemonConfig} from './plugins/daemon'
import {CommandParser} from "./plugins/commandParser";
import ts from "typescript/lib/tsserverlibrary";
export type PluginMiddleware=(plugin:Plugin)=>void
export interface pluginModule{
    apply(plugin:Plugin):void
    using?:string[]
}
export class Plugin extends Base{
    public commands:Map<string,Command>=new Map<string, Command>()
    public commandList:Command[]=[]
    public jobs:CronJob[]=[]
    constructor(public name:string,fullPath:string) {
        super(`plugin`,name,fullPath)
        this.app.plugins[name]=this
    }
    dispose(){
        this.disposes.forEach(callback=>callback())
        this.emit('dispose')
    }
    appendTo(groupName:string){
        let group=this.app.pluginGroup.get(groupName)
        if(!group) this.app.pluginGroup.set(groupName,group=[])
        const defaultGroup=this.app.pluginGroup.get('default')
        const idx=defaultGroup.indexOf(this)
        defaultGroup.splice(idx,1)
        group.push(this)
        return this
    }
    middleware(middleware:Middleware,prepend?){
        this.app.use(middleware,prepend)
        return ()=>remove(this.app.middlewares,middleware)
    }
    plugin(apply:PluginMiddleware,using?:string[])
    plugin(plugin:string,using?:string[])
    plugin(module:pluginModule)
    plugin(entry:PluginMiddleware|pluginModule|string,using:string[]=typeof entry==='object'?entry['using']||[]:[]){
        const callback=()=>{
            if(using.every(s=>Object.keys(this.app.services).includes(s))){
                dispose()
                if(typeof entry==='string') this.app.load(entry,'plugin')
                else if(typeof entry==='function')entry(this)
                else entry.apply(this)
            }
            return this
        }
        const dispose=__OITQ__.on(`service-start`,callback)
        return callback()
    }
    using(using:string[],apply:PluginMiddleware){
        return this.plugin(apply,using)
    }
    command<D extends string>(def: D,triggerEvent:TargetType|'all'): Command<Argv.ArgumentType<D>>{
        const namePath = def.split(' ', 1)[0]
        const decl = def.slice(namePath.length)
        const segments = namePath.split(/(?=[/])/g)

        let parent: Command, nameArr=[]
        while (segments.length){
            const segment=segments.shift()
            const code = segment.charCodeAt(0)
            const tempName = code === 47 ? segment.slice(1) : segment
            nameArr.push(tempName)
            if(segments.length)parent=this.app.commandList.find(cmd=>cmd.name===tempName)
            if(!parent && segments.length) throw Error(`cannot find parent command:${nameArr.join('.')}`)
        }
        const name=nameArr.pop()
        const command = new Command(name+decl,this,triggerEvent)
        if(parent){
            command.parent=parent
            parent.children.push(command)
        }
        this.commands.set(name,command)
        this.commandList.push(command)
        this.disposes.push(()=>{
            remove(this.commandList,command)
            this.commands.delete(name)
            this.app.emit('command-remove',command)
            this.logger.debug('destroy command:'+name)
            return true
        })
        this.logger.debug('register command:'+name)
        this.app.emit('command-add',command)
        return command as any
    }
    static createCronCommand(command:CronCommand,ctx:object){
        if(typeof command==="function") return command.bind(ctx)
        return command
    }
    cron(cronTime:string,cronCommand:CronCommand,context:object=this){
        const job=new CronJob(cronTime,Plugin.createCronCommand(cronCommand,context),null,true)
        this.jobs.push(job)
        this.disposes.push(()=>{
            job.stop();
            return remove(this.jobs,job)
        })
        return this
    }
}
export function definePlugin(options:Plugin.DefineOptions):Plugin{
    options=deepClone(deepMerge(Plugin.defaultDefineOptions,options))
    const plugin=new Plugin(options.name,options.watchPath)
    Object.keys(options.listeners).forEach(key=>{
        const listeners=[].concat(options.listeners[key])
        listeners.forEach(listener=>{
            plugin.on(key,listener.bind(plugin))
        })
    })
    if(options.onLoad)options.onLoad.apply(plugin)
    if(options.onStart) plugin.on('start',options.onStart.bind(plugin))
    if(options.onDispose) plugin.on('dispose',options.onDispose.bind(plugin))
    return plugin
}
export namespace Plugin {
    export interface Config{
        watcher:Watcher.Config
        commandParser:CommandParser
        help:null
        terminalLogin:null
        daemon:DaemonConfig
    }
    type EventOptions={
        [K in keyof OitqEventMap]?:OitqEventMap[K]
    }
    export const defaultDefineOptions:Partial<DefineOptions>={
        commands:[],
        listeners:{},
        onLoad() {},
        onStart() {},
        onDispose() {}
    }
    export interface DefineOptions{
        name:string
        watchPath:string
        commands?:Command.DefineOptions[]
        listeners?:EventOptions
        onLoad?(this:Plugin):void
        onStart?(this:Plugin):void
        onDispose?(this:Plugin):void
    }
}
