import {Command} from "@lc-cn/command";
import {NSession,Bot,Context} from ".";
export * from '@lc-cn/command'
declare module '@lc-cn/command/lib/command'{
    interface Command{
        context:Context
        shortcut(name: string | RegExp, config?: Command.Shortcut):Command
        match(session?: NSession<'message'>) :boolean
    }
}
declare module '@lc-cn/command/lib/argv'{

    interface Argv{
        session?:NSession<'message'>
        bot?:Bot
    }

}
Command.prototype.shortcut=function (this:Command,name,config:Command.Shortcut={}){
    config.name = name
    config.command = this
    config.authority ||= this.config.authority
    this.context.app._shortcuts.push(config)
    return this
}
Command.prototype.match=function (this:Command,session?){
    return this.context.match(session)
}
const oldSubCommand=Command.prototype.subcommand
Command.prototype.subcommand=function(this:Command,def:string,...args:any[]){
    const command=oldSubCommand.bind(this)(def,...args)
    command.context=this.context
    this.context.app._commands.set(command.name,command)
    this.context.app._commandList.push(command)
    this.context.emit('command.add',command)
    return command
}
