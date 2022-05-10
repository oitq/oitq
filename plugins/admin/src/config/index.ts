import {Plugin} from 'oitq';
import * as oitq from './oitqConfig'
export const name='admin.config'
export function install(ctx:Plugin){
    ctx.command('admin/config','message.private')
        .desc('更改配置文件')
    ctx.plugin(oitq)
}
