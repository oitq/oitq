import {Plugin, Action} from "oitq";
import {AtElem} from 'oicq'
export const name = 'admin.group'

function checkAdmin({session}: Action) {
    let result

    if ((!['admin', 'owner'].includes(session.sender['role']) && !session.bot.admins.includes(session.sender.user_id))
        || (!session.bot.pickGroup(session.group_id).is_admin
            && !session.bot.pickGroup(session.group_id).is_owner)) {
        if(!['admin', 'owner'].includes(session.sender['role'])){
            result='你不是本群群主/管理员'
        }else if(!session.bot.admins.includes(session.sender.user_id)){
            result='你不是我的管理员'
        }
        if(!session.bot.pickGroup(session.group_id).is_admin){
            result='我不是群主'
        }else if(!session.bot.admins.includes(session.sender.user_id)){
            result='我不是管理员'
        }
        return '权限不足：'+result
    }
}

export function install(ctx: Plugin) {
    ctx.command('admin/group','message.group')
        .desc('群成员管理')
    ctx.command('admin/group/mute [...userIds:qq]', 'message.group')
        .desc('禁言群成员')
        .option('time', '-t <time:number> 禁言时长（单位：秒；默认：600）')
        .check(checkAdmin)
        .action(async ({session, bot, options}, ...user_ids) => {
            if (!user_ids.length) {
                const {ids} = await session.prompt({
                    type: 'list',
                    message: '请输入你要禁言的成员qq',
                    separator:',',
                    name: 'ids',
                    format: (value) => value.map(val => Number(val))
                })
                if (ids.length) user_ids.push(...ids)
            }
            if (!user_ids.length) return '禁言了0个成员'
            for (const user_id of user_ids) {
                await bot.pickGroup(session.group_id).muteMember(user_id, options.time)
            }
            if (options.time === 0) return `已解除禁言:${user_ids.join(',')}。`
            return `已禁言:${user_ids.join(',')}。\n禁言时长：${(options.time || 600) / 60}分钟`
        })

    ctx.command('admin/group/kick [...user_id:qq]', 'message.group')
        .desc('踢出群成员')
        .option('block', '-b 是否拉入黑名单(默认false)')
        .check(checkAdmin)
        .action(async ({session, bot, options}, ...user_ids) => {
            if (!user_ids.length) {
                const {ids} = await session.prompt({
                    type: 'list',
                    message: '请输入你要踢出的成员qq',
                    separator:',',
                    name: 'ids',
                    format: (value) => value.map(val => Number(val))
                })
                if (ids.length) user_ids.push(...ids)
            }
            if (!user_ids.length) return '踢出了0个成员'
            for (const user_id of user_ids) {
                await bot.pickGroup(session.group_id).kickMember(user_id, options.block)
            }
            return `已踢出成员:${user_ids.join(',')}。`
        })
    ctx.command('admin/group/invite [...user_id:qq]', 'message.group')
        .desc('邀请好友加入群')
        .action(async ({session, bot, options}, ...user_ids) => {
            if (!user_ids.length) {
                const {ids} = await session.prompt({
                    type: 'list',
                    message: '请输入你要邀请的好友qq',
                    separator:',',
                    format: (value) => value.map(val => Number(val)),
                    name: 'ids'
                })
                if (ids) user_ids.push(...ids)
            }
            if (!user_ids.length) return '邀请了了0个好友'
            for (const user_id of user_ids) {
                await bot.pickGroup(session.group_id).invite(user_id)
            }
            return `已邀请:${user_ids.join(',')}。`
        })
    ctx.command('admin/group/setAdmin [...user_id:qq]','message.group')
        .desc('设置/取消群管理员')
        .option('cancel','-c 是否为取消(为true时即取消管理员)')
        .check(({session})=>{
            if (session.bot.master!==session.sender.user_id ||!session.bot.pickGroup(session.group_id).is_owner) {
                return '权限不足：'+(session.bot.master!==session.sender.user_id?'主人才能调用':'我不是群主')
            }
        })
        .action(async ({session,bot,options}, ...user_ids)=>{
            if (!user_ids.length) {
                const {ids} = await session.prompt({
                    type: 'list',
                    message: `请输入你要${!options.cancel?'设置':'取消'}管理员的成员qq`,
                    name: 'ids',
                    separator:',',
                    format: (value) => value.map(val => Number(val))
                })
                if (ids.length) user_ids.push(...ids)
            }
            if (!user_ids.length) return `${!options.cancel?'设置':'取消'}了0个管理员`
            for (const admin of user_ids) {
                await bot.pickGroup(session.group_id).setAdmin(admin,!options.cancel)
            }
            return `已将${user_ids.join(',')}${!options.cancel?'设置为':'取消'}管理员。`
        })
    ctx.command('admin/group/setTitle [title:string] [user_id:qq]','message.group')
        .desc('设置群成员头衔')
        .check(({session})=>{
            if (session.bot.master!==session.sender.user_id ||!session.bot.pickGroup(session.group_id).is_owner) {
                return '权限不足：'+(session.bot.master!==session.sender.user_id?'主人才能调用':'我不是群主')
            }
        })
        .action(async ({session,bot},title,user_id)=>{
            if(!user_id){
                const {id} = await session.prompt({
                    type: 'number',
                    message: `请输入你要设置头衔的成员qq`,
                    name: 'id',
                })
                if (id) user_id=id
            }
            if(!user_id)return '群成员qq无效'
            if(!title){
                const {nTitle} = await session.prompt({
                    type: 'text',
                    message: `请输入你要设置头衔的成员qq`,
                    name: 'nTitle',
                })
                if (nTitle) title=nTitle
            }
            if(!title) return '头衔不能为空'
            await bot.pickGroup(session.group_id).setTitle(user_id,title)
            return '执行成功'
        })
    ctx.command('admin/group/setCard [card:string] [user_id:qq]','message.group')
        .desc('设置群成员名片')
        .check(checkAdmin)
        .action(async ({session,bot},title,user_id)=>{
            if(!user_id){
                const {id} = await session.prompt({
                    type: 'number',
                    message: `请输入你要设置名片的成员qq`,
                    name: 'id',
                })
                if (id) user_id=id
            }
            if(!user_id)return '群成员qq无效'
            if(!title){
                const {nTitle} = await session.prompt({
                    type: 'text',
                    message: `请输入你要设置名片的成员qq`,
                    name: 'nTitle',
                })
                if (nTitle) title=nTitle
            }
            if(!title) return '名片不能为空'
            await bot.pickGroup(session.group_id).setCard(user_id,title)
            return '执行成功'
        })
}
