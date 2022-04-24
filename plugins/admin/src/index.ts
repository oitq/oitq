import {Context} from "oitq";
export const name='admin'
import * as config from './config'
import * as plugin from './plugin'
export function install(ctx:Context){
    ctx.private()
        .plugin(config)
        .plugin(plugin)
        .command('admin','管理Bot')
}
