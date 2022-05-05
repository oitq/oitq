import {CAC} from "cac";
import {
    dir,
    defaultAppOptions, AppOptions,
    getAppConfigPath,
    readConfig, writeConfig, getBotConfigPath, defaultBotOptions
} from "oitq";
import axios from "axios";
import {createIfNotExist} from "@oitq/utils";
import path from "path";
const prompts=require('prompts')
export async function removeBot(){
    createIfNotExist(path.join(dir,'configFilePath'),dir)
    const dirReal=readConfig(path.join(dir,'configFilePath'))
    createIfNotExist(getAppConfigPath(dirReal),defaultAppOptions)
    createIfNotExist(getBotConfigPath(dirReal),defaultBotOptions)
    const appOptions:AppOptions=readConfig(getAppConfigPath(dirReal))
    const {uin}=await prompts({type:"number",name:'uin',message:'请输入uin'})
    let index=appOptions.bots.findIndex(bot=>bot.uin===uin)
    if(index===-1){
        console.error(`机器人${uin}不存在`)
        return
    }
    appOptions.bots.splice(index,1)
    writeConfig(getAppConfigPath(dirReal),appOptions)
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
