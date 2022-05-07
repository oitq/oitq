import {Context} from "oitq";
import {Requester} from "./request/requester";

declare module 'oitq'{
    namespace Context{
        interface Services{
            axios:Requester
        }
    }
}
export interface Config {
    axios?:false|Requester.Config
}
Context.service('axios')
export const name='常用工具'
export function install(ctx:Context,config:Config){
    if(config.axios!==false)ctx.axios=Requester.create(config.axios)
    const cmd=ctx.command('utils','公共工具')
    cmd.subcommand('axios.get <url>','发起get请求')
        .option('config','-c 配置请求config')
        .action(async ({session,options},url)=>{
            let config=undefined
            if(options.config){
                const {c}=await session.prompt({
                    type:'text',
                    name:'c',
                    message:'请输入配置详情',
                })
                try{
                    config=JSON.parse(c)
                }catch {}
            }
            return JSON.stringify(await ctx.axios.get(url,config),null,2)
        })
    cmd.subcommand('axios.post <url>','发起post请求')
        .option('config','-c 配置请求config')
        .option('data','-d post数据')
        .action(async ({session,options},url)=>{
            let config=undefined
            let data=undefined
            if(options.data){
                const {d}=await session.prompt({
                    type:'text',
                    name:'d',
                    message:'请输入配置详情',
                })
                try{
                    data=JSON.parse(d)
                }catch {}
            }
            if(options.config){
                const {c}=await session.prompt({
                    type:'text',
                    name:'c',
                    message:'请输入配置详情',
                })
                try{
                    config=JSON.parse(c)
                }catch {}
            }
            return JSON.stringify(await ctx.axios.post(url,data,config),null,2)
        })

}
