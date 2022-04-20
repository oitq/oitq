import {CAC} from "cac";
import {
    dir,
    defaultAppOptions, AppOptions,
    getAppConfigPath,
    readConfig, writeConfig, getOneBotConfigPath, defaultOneBotConfig, getBotConfigPath, defaultBotOptions
} from "oitq";
import axios from "axios";
import {createIfNotExist} from "@oitq/utils";
import {addBot} from "./addBot";
const prompts=require('prompts')
createIfNotExist(getAppConfigPath(dir),defaultAppOptions)
createIfNotExist(getOneBotConfigPath(dir),defaultOneBotConfig)
createIfNotExist(getBotConfigPath(dir),defaultBotOptions)
const appOptions:AppOptions=readConfig(getAppConfigPath(dir))
const request=axios.create({baseURL:`http://127.0.0.1:${appOptions.port||8080}`})
export async function removeBot(){
    const {uin}=await prompts({type:"number",name:'uin',message:'请输入uin'})
    let index=appOptions.bots.findIndex(bot=>bot.uin===uin)
    if(index===-1){
        console.error(`机器人${uin}不存在`)
        return
    }
    appOptions.bots.splice(index,1)
    if(appOptions.start){
        const {removeNow}=await prompts({
            name:'removeNow',
            type:'confirm',
            message:'是否立即移除？',
            initial:true
        })
        if(removeNow)await request.get('/remove',{params:{uin}})
    }
    writeConfig(getAppConfigPath(dir),appOptions)
    console.log('配置已保存，下次启动时将不再登录该账号')
}
export default function registerRemoveCommand(cli:CAC){
    cli.command('remove','移除bot')
        .action(async ()=>{

            try{
                await removeBot()
            }catch (e){
                console.log(e.message)
            }
        })
}
