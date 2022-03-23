import {Context} from "@/core";

export function install(ctx:Context){
    const cmd=ctx.command('manage','群管理')
        .action(({session})=>{
            return session.execute('help manage')
        })
    cmd.subcommand('mute [user_id:number]','禁言指定群成员')
        .action(({session},user_id)=>{

        })
}
