import {Plugin} from "oitq";
import * as time from './time'
import * as request from "./request";
export const name='常用工具'
export function install(ctx:Plugin){
    ctx.command('utils','message')
        .desc('公共工具')
    ctx.plugin(time)
    ctx.plugin(request)
}
