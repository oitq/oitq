import {Context} from 'oitq';
import * as oitq from './oitqConfig'
export const name='admin.config'
export function install(ctx:Context){
    ctx.command('admin/config','更改配置文件')
    ctx.plugin(oitq)
}
