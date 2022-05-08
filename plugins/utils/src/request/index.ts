import {Context} from "oitq";
import {Requester} from "./requester";
import {toCqcode} from "@oitq/utils";
import {segment} from "oicq";
import path from "path";
import fs from "fs";
export interface RequestConfig extends Requester.Config{
}

declare module 'oitq'{
    namespace Context{
        interface Services{
            axios:Requester
        }
    }
}
Context.service('axios')
export const name='request'
export function install(ctx:Context,config:RequestConfig){
    ctx.axios=Requester.create(config)
    ctx.command('utils/axios.get <url>','发起get请求')
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
    ctx.command('utils/axios.load <url>','加载资源')
        .option('type','-t [type] 资源类型，可选值：image,music,video，默认：image',{fallback:'image'})
        .action(async ({session,options},url)=>{
            try{
                const res=await ctx.axios.get(encodeURI(url),{
                    responseType: 'arraybuffer'
                })
                switch (options.type){
                    case 'music':
                        return toCqcode({message:[segment.record(`base64://${Buffer.from(res,'binary').toString('base64')}`)]})
                    case 'image':
                        return toCqcode({message:[segment.image(`base64://${Buffer.from(res,'binary').toString('base64')}`)]})
                    case 'video':
                        const fileUrl=path.join(session.bot.config.data_dir,`${new Date().getTime()}.mp4`)
                        await fs.promises.writeFile(fileUrl, res, 'binary');
                        return toCqcode({message:[segment.video(fileUrl)]})
                    default:
                        return '未知类型：'+options.type
                }
            }catch (e){
                return e.message
            }
        })
    ctx.command('utils/axios.post <url>','发起post请求')
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
