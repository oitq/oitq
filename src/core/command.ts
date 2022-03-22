import {Command} from "@lc-cn/command";
import {App} from "@/core/app";
import {NSession,Bot} from "@/core/bot";

declare module '@lc-cn/command/lib/command'{

    interface Command{
        app:App
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
Command.prototype.shortcut=function (this:Command,name,config={}){
    config.name = name
    config.command = this
    config.authority ||= this.config.authority
    this.app._shortcuts.push(config)
    return this
}
Command.prototype.match=function (this:Command,session?){
    return true
}
const oldSubCommand=Command.prototype.subcommand
Command.prototype.subcommand=function(this:Command,def:string,...args:any[]){
    const command=oldSubCommand.bind(this)(def,...args)
    command.app=this.app
    this.app._commands.set(command.name,command)
    this.app._commandList.push(command)
    this.app.emit('command.add',command)
    return command
}
