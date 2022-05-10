import {Plugin} from "oitq";
export const name='farm'
export function install(ctx:Plugin){
    ctx.command('farm','message.group')
        .desc('农场')
        .alias('农场')
        .shortcut('农场帮助',{option:{help:true}})
        .option('menu','-m 农场菜单',{initial:true})
        .shortcut('农场菜单',{option:{menu:true}})
        .action(async ({session,options})=>{

        })
}
