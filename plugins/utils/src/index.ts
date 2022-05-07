import {Context} from "oitq";
import {Requester} from "./request/requester";
import * as time from './time'
import {MessageElem, segment} from "oicq";
import {toCqcode} from "@oitq/utils";
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
    ctx.plugin(time)
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
            const res=await ctx.axios.get(url,config)
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })
    cmd.subcommand('axios.load <url>','加载资源')
        .option('type','-t [type] 资源类型，可选值：image,music,video，默认：image',{fallback:'image'})
        .action(async ({session,options},url)=>{
            const res=await ctx.axios.get(url,{
                responseType: 'arraybuffer'
            })
            try{
                switch (options.type){
                    case 'music':
                        return toCqcode({message:[segment.record(`base64://${Buffer.from(res,'binary').toString('base64')}`)]})
                    case 'image':
                        return toCqcode({message:[segment.image(`base64://${Buffer.from(res,'binary').toString('base64')}`)]})
                    case 'video':

                    default:
                        return '未知类型：'+options.type
                }
            }catch (e){
                return e.message
            }
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
            const res=await ctx.axios.post(url,data,config)
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })

}
