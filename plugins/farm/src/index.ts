import {Context} from "oitq";
export const name='farm'
export function install(ctx:Context){
    ctx.group()
        .command('farm','农场')
        .alias('农场')
        .shortcut('农场帮助',{options:{help:true}})
        .option('menu','-m 农场菜单',{fallback:true})
        .shortcut('农场菜单',{options:{menu:true}})
        .action(async ({session,options})=>{

        })
}
