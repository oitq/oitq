import {Base} from "./base";
import {Dispose, Middleware, TargetType} from "./types";
import {Command} from "./command";
import {remove} from "./utils";
import {Argv} from "./argv";
import {Watcher} from "./plugins/watcher";
import {CommandParser} from "./plugins/commandParser";
import {App} from "./app";

export class Plugin extends Base{
    public commands:Map<string,Command>=new Map<string, Command>()
    public commandList:Command[]=[]
    constructor(public name:string,fullPath:string) {
        super(`plugin`,name,fullPath)
        this.app.plugins[name]=this
        return new Proxy(this,{
            get(target: Plugin, p: string | symbol, receiver: any): any {
                if(target[p]!==undefined) return target[p]
                return target.app[p]
            }
        })
    }
    setTimeout(callback:Function,ms:number,...args):Dispose{
        const timer=setTimeout(callback,ms,...args)
        const dispose=()=>{clearTimeout(timer);return true}
        this.disposes.push(dispose)
        return dispose
    }
    setInterval(callback:Function,ms:number,...args):Dispose{
        const timer=setInterval(callback,ms,...args)
        const dispose=()=>{clearInterval(timer);return true}
        this.disposes.push(dispose)
        return dispose
    }
    dispose(){
        this.disposes.forEach(callback=>callback())
        this.emit('dispose')
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
    cron(){

    }
}
export interface Plugin extends App.Services{}
export namespace Plugin{
    export interface Config{
        watcher:Watcher.Config
        commandParser:CommandParser
    }
}
