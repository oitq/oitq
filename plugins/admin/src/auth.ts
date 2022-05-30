import {Command, Plugin} from 'oitq'
import {} from '@oitq/service-database'
import {ChannelId, NSession} from "oitq/lib";

export const using = ['database'] as const
export const name='admin/auth'
export function install(plugin: Plugin) {
    const checkAuth = (command:Command) => {
        command.check(({session}) => {
            if (session.user.authority < command.authority) return '您的权限不足以调用该指令'
        })
    }
    for (const command of plugin.app.commandList) {
        command.use(checkAuth)
    }
    plugin.app.on('command-add', (command) => command.use(checkAuth))
    plugin.command('admin/auth [qq:qq] [authority:integer]', 'message')
        .desc('设置某个用户的权限等级')
        .auth(4)
        .action(async ({session}, user_id, authority) => {
            if(session.user.authority< authority) return `设置的等级不能>=你的等级(${session.user.authority})`
            try {
                const user=await plugin.database.models.User.findOne({where:{user_id}})
                if(!user) return `未找到用户：${user_id}`
                if(user.toJSON().authority>=session.user.authority) return '你不能设置同级或上级的权限等级'
                const success = await user.update({authority}, {where: {user_id}})
                return `已调用：设置${user_id}的权限为${authority},成功数:${success}`
            } catch (e) {
                return `设置失败,错误信息:${e.message}`
            }
        })
    async function createApplyFallback(session:NSession,authority:number){
        await session.bot.sendMsg(`private:${session.bot.master}` as ChannelId,`用户${session['user'].name}(${session.user_id})正在申请更改自身权限为${authority},发送同意以确认，其他内容为拒绝理由`)
        const sess=await session.bot.waitMessage((session1 => session1.message_type==='private' && session1.user_id===session.bot.master))
        if(!sess)return
        if(sess.cqCode==='同意'){
            await plugin.database.models.User.update({authority},{where:{user_id:session.user_id}})
            session.reply('管理员已同意，你的等级现在为：'+authority,true)
            sess.reply('已完成操作')
        }
        else session.reply(`被拒绝，原因为：\n`+sess.cqCode,true)
    }
    plugin.command('apply <level:integer>','message')
        .desc('申请权限，可申请(1-6)')
        .desc('申请权限')
        .check((_,level)=>level>6||level<1?'仅允许申请1-6的等级':false)
        .action(async ({session,options},level)=>{
            if(session.user.authority===level) return `未发生改变`
            if(session.bot.isMaster(session.user_id)){
                await plugin.database.models.User.update({authority:level},{where:{user_id:session.user_id}})
                return '已设置成功'
            }
            createApplyFallback(session as unknown as NSession,level)
            return `已经向master发起申请，结果稍后告知`
        })
}
