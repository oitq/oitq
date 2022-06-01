import {Plugin} from "oitq";
export const name='admin'
import * as bot from './bot'
import * as configPlugin from './config'
import * as plugin from './plugin'
import * as auth from './auth'
import {BotConfig} from "./bot";
interface Config extends BotConfig{

}
export function install(p:Plugin,config?:Config){
    p.command('admin','message').desc('管理Bot')
    p.plugin(configPlugin)
    p.plugin(bot,config)
    p.plugin(plugin)
    p.plugin(auth)
}
