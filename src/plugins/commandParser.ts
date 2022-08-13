import {Plugin} from "oitq";
export function install(plugin:Plugin,config:CommandParser){
    plugin.appendTo('builtin')
    if(config){
        if(typeof config==="boolean" ||config.enable){
            plugin.middleware(async (session)=>{
                let result=await session.execute()
                if(result&&typeof result!=='boolean')session.sendMsg(result)
            })
        }
    }

}
export type CommandParser={
    enable?:boolean
}|boolean
