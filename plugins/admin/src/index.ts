import {Context} from "oitq";
export const name='admin'
import * as bot from './bot'
import * as config from './config'
import * as plugin from './plugin'
export function install(ctx:Context){
    ctx
        .plugin(config)
        .plugin(bot)
        .plugin(plugin)
        .command('admin','管理Bot')
}
