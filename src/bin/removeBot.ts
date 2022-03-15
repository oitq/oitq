import {CAC} from "cac";
import * as path from "path";
import {AppOptions} from "@/app";
import * as fs from "fs";
import axios from "axios";
const prompts=require('prompts')
const request=axios.create({baseURL:'http://127.0.0.1'})
const appConfigPath=path.join(process.cwd(),'oicq.config.json')
const appOptions:AppOptions=JSON.parse(fs.readFileSync(appConfigPath,{encoding:'utf-8'}))
export default function registerRemoveCommand(cli:CAC){
    cli.command('remove','移除bot')
        .action(async ()=>{
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
            fs.writeFileSync(appConfigPath,JSON.stringify(appOptions),{encoding:'utf-8'})
        })
}
