import {CAC} from "cac";
import {AppOptions} from "@/app";
import axios from "axios";
import {getAppConfigPath, readConfig, writeConfig} from "@/utils";
import {dir} from "@/bin/index";
const prompts=require('prompts')
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
        await request.get('/remove',{params:{uin}})
    }
    writeConfig(getAppConfigPath(dir),appOptions)
}
export default function registerRemoveCommand(cli:CAC){
    cli.command('remove','移除bot')
        .action(removeBot)
}
