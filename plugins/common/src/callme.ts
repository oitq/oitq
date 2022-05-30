import {Plugin,template} from "oitq";
import {} from '@oitq/service-database'

export const name = 'callme'
export const using = ['database'] as const
template.set('callme', {
    'current': '好的呢，{0}！',
    'unnamed': '你还没有给自己起一个称呼呢~',
    'unchanged': '称呼未发生变化。',
    'empty': '称呼不能为空。',
    'invalid': '称呼中禁止包含纯文本以外的内容。',
    'duplicate': '禁止与其他用户重名。',
    'updated': '好的，{0}，请多指教！',
    'failed': '修改称呼失败。',
})

export function install(ctx: Plugin) {
    ctx.command('common/callme [name:text]','message')
        .alias('叫我')
        .desc('修改自己的称呼')
        .shortcut(/^叫我(\S+)$/,{args:['$1']})
        .action(async ({session}, name) => {
            const {user} = session
            if (!name) {
                if (user.name) {
                    return template('callme.current', session.user.name)
                } else {
                    return template('callme.unnamed')
                }
            } else if (name === user.name) {
                return template('callme.unchanged')
            } else if (!(name = name.trim())) {
                return template('callme.empty')
            } else if (name.includes('[CQ:')) {
                return template('callme.invalid')
            }
            try {
                user.name = name
                await ctx.app.database.models.User.update({
                        name,
                    },
                    {
                        where: {
                            user_id: session.user.user_id
                        }
                    })
                return template('callme.updated', name)
            } catch (error) {
                ctx.getLogger('common').warn(error)
                return template('callme.failed')
            }
        })
}
