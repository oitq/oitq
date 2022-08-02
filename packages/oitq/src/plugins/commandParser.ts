import {OitqPlugin} from "oitq";
const commandParser=new OitqPlugin('commandParser',__filename)
const config:CommandParser=commandParser.config
if(config){
    if(typeof config==="boolean" ||config.enable){
        commandParser.middleware(async (session)=>{
            let result=await session.execute()
            if(result&&typeof result!=='boolean')session.sendMsg(result)
        })
    }
}

export type CommandParser={
    enable?:boolean
}|boolean
