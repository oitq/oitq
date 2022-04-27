import {Context,getAppConfigPath,dir} from 'oitq'
import ConfigLoader from '@oitq/loader'
export const name='admin.config.oitq'
export function install(ctx:Context){
    ctx.command('admin/config/oitq [key] [value]','更改oitq配置文件')
        .option('delete','-d 删除指定key值')
        .check(async ({session})=>{
            if(!session.bot.isMaster(session.user_id)&&!session.bot.isAdmin(session.user_id)){
                return '权限不足'
            }
        })
        .action(async ({session,options},key,value)=>{
            const keys:string[]=[]
            if(key)keys.push(...key.split('.'))
            const cl=new ConfigLoader(getAppConfigPath(ctx.app.options.dir))
            cl.readConfig()
            let currentValue:any=cl.config
            let pre=currentValue
            let k
            while (keys.length){
                k=keys.shift()
                if(!currentValue[k] && keys.length)currentValue[k]={}
                if(currentValue===undefined && keys.length)return `未找到oitq.${key}`
                pre=currentValue
                currentValue=currentValue[k]
            }
            if(options.delete && k){
                delete pre[k]
                await cl.writeConfig()
                return '删除成功'
            }
            if(value===undefined){
                if(currentValue===undefined)return `未找到oitq.${key}`
                return JSON.stringify(currentValue,null,4).replace(/"/g,'')
            }
            try{
                value=JSON.parse(value)
            }catch {}
            pre[k]=value
            await cl.writeConfig()
            return '修改成功'
        })
}
