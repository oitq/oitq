import {Base} from "./base";
import {CronJob,CronCommand} from 'cron'
import {Dispose, Middleware, TargetType} from "./types";
import {Command} from "./command";
import {remove} from "./utils";
import {Argv} from "./argv";

export class OitqPlugin extends Base{
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
        const job=new CronJob(cronTime,OitqPlugin.createCronCommand(cronCommand,context),null,true)
        this.jobs.push(job)
        this.disposes.push(()=>{
            job.stop();
            return remove(this.jobs,job)
        })
        return this
    }
}
