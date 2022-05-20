import {Plugin} from "oitq";
export const name='admin'
import * as bot from './bot'
import * as config from './config'
import * as plugin from './plugin'
import * as auth from './auth'
export function install(p:Plugin){
    p.command('admin','message').desc('管理Bot')
    p.plugin(config)
    p.plugin(bot)
    p.plugin(plugin)
    p.plugin(auth)
}
