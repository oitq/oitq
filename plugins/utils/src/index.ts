import {Context} from "oitq";
import {Requester} from "./request/requester";

declare module 'oitq'{
    namespace Context{
        interface Services{
            axios:false|Requester
        }
    }
}
export interface Config {
    axios?:Requester.Config
}
Context.service('axios')
export const name='常用工具'
export function install(ctx:Context,config:Config){
    if(config.axios!==false)ctx.axios=Requester.create(config.axios)
}
