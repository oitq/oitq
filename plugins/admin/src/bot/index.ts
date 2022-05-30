import {Plugin} from 'oitq';
import * as group from './group'
import * as privatePlugin from './private'
export const name='admin.bot'
import {} from '@oitq/service-database'
export const using=['database'] as const
export function install(ctx:Plugin){
    ctx.app.on('continue',async (session)=>session.user.ignore)
    ctx.plugin(privatePlugin)
    ctx.plugin(group)
    ctx.command('admin/ignore [...qq:qq]','message')
        .desc('忽略指定用户的信息')
        .option('list','-l 显示忽略用户列表')
        .option('remove','-r 移除已忽略的用户')
        .check(({session})=>{
            return !session.bot.isMaster(session.user_id)
        })
        .action(async ({session,options},...user)=>{
            if(options.list){
                return `已忽略以下用户的消息：\n`+(await ctx.database.models.User.findAll({
                    attributes:['user_id','name'],
                    where:{
                        ignore:true
                    }
                })).map(user=>user.toJSON()).map((user,idx)=>`${idx+1}  qq:${user.user_id},name:${user.name}`).join('\n')
            }
            if(!user || !user.length)return ''
            let applySuccess=false,errMsg:string=''
            try{
                const [effect]= await ctx.database.models.User.update({ignore:!options.remove},{where:{user_id:user}})
                if(effect)applySuccess=true
            }catch (e){
                errMsg=e
            }
            return `${options.remove?'取消':''}忽略${applySuccess?'成功':'失败'}${applySuccess?'':`\n错误信息：${errMsg}`}`
        })
}
