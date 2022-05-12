import {Plugin,NSession} from "oitq";
export const name='admin.bot.private'
function applyAdminHandler(ctx:Plugin,session:NSession<'request'>){
    const dispose=ctx.middleware(async (sess)=>{
        if(['同意','拒绝','不同意'].includes(sess.cqCode)){
            await session.approve(['同意'].includes(sess.cqCode))
            await sess.sendMsg(`已完成你的操作：【${sess.cqCode}】`)
            const otherAdmin=session.bot.admins.filter(admin=>admin!==sess.user_id)
            await session.bot.broadcast(otherAdmin,`管理员【${sess.user_id}】已处理`)
            dispose()
        }
    })
}
export function install(ctx:Plugin){

    ctx.on('bot.request.friend.add',async (session)=>{
        if(session.bot.admins.includes(session.user_id)) return session.approve(true)
        await session.bot.broadcast(session.bot.admins,`来自【${session.source}】的【${session.nickname}】请求添加好友`)
        applyAdminHandler(ctx,session)
    })
    ctx.on('bot.request.group.add',async (session)=>{
        if(session.bot.admins.includes(session.user_id)) return session.approve(true)
        await session.bot.broadcast(session.bot.admins,`【${session.group_name}】:【${session.nickname}】请求加群，备注信息:\n${session.comment}`)
        applyAdminHandler(ctx,session)
    })
    ctx.on('bot.request.group.invite',async (session)=>{
        if(session.bot.admins.includes(session.user_id)) return session.approve(true)
        await session.bot.broadcast(session.bot.admins,`【${session.user_id}】邀请加群【${session.group_name}】`)
        applyAdminHandler(ctx,session)
    })
}
