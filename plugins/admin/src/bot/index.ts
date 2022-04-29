import {Context} from 'oitq';
import * as group from './group'
import * as privatePlugin from './private'
export const name='admin.bot'
export function install(ctx:Context){
    ctx.command('admin/bot','机器人管理相关指令')
    ctx.private().plugin(privatePlugin)
    ctx.group().plugin(group)
}
