import {Plugin} from "oitq";
import * as time from './time'
import * as request from "./request";

export interface Config{
    axios?:request.RequestConfig
}
export {Requester} from './request'
export const name='常用工具'
export function install(ctx:Plugin,config:Config){
    ctx.command('utils','message')
        .desc('公共工具')
    ctx.plugin(time)
    if(config.axios!==false){
        ctx.plugin(request,config.axios)
    }
}
