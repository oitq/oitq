import {Plugin} from "oitq";
import {Requester} from "./requester";
import {toCqcode} from "@oitq/utils";
import {segment} from "oicq";
import path from "path";
import fs from "fs";
export interface RequestConfig extends Requester.Config{
}
export {Requester}
declare module 'oitq'{
    namespace Plugin{
        interface Services{
            axios:Requester
        }
    }
}
export const name='request'
export function install(ctx:Plugin,config:RequestConfig){
    ctx.axios=Requester.create(config)
    ctx.command('utils/axios.get <url>','message')
        .desc('发起get请求')
        .option('callback','-c <callback:function> 回调函数')
        .option('config','-C <config:object> 配置请求config')
        .action(async ({session,options},url)=>{
            const res=await ctx.app.axios.get(url,options.config)
            const target=session['group']||session['friend']
            if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target)})
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })
    ctx.command('utils/axios.load <url>','message')
        .desc('加载资源')
        .option('callback','-c <callback:function> 回调函数')
        .option('type','-t [type] 资源类型，可选值：image,music,video，默认：image',{initial:'image'})
        .action(async ({session,options},url)=>{
            try{
                const res=await ctx.app.axios.get(encodeURI(url),{
                    responseType: 'arraybuffer'
                })
                if(options.callback) return options.callback.apply(res)
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
    ctx.command('utils/axios.post <url>','message')
        .desc('发起post请求')
        .option('callback','-c <callback:function> 回调函数')
        .option('config','-C <config:object> 配置请求config')
        .option('data','-d <data:object> post数据')
        .action(async ({session,options},url)=>{
            const res=await ctx.app.axios.post(url,options.data,options.config)
            const target=session['group']||session['friend']
            if(options.callback) return options.callback.apply({result:res,shareMusic:target.shareMusic.bind(target)})
            try{
                return JSON.stringify(res,null,2)
            }catch {
                return typeof res==='string'?res:undefined
            }
        })

}
Plugin.service('axios')
