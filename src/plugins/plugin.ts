import {App} from "@/core";

export function install(ctx:App){
    ctx.command('plugin','管理插件')
        .option('enable','-e 启用指定插件')
        .option('disable','-d 禁用指定插件')
        .option('install','-i 安装指定插件')
        .option('remove','-r 移除指定插件')
        .action(async ({session,options})=>{
            if(Object.keys(options).length>1) return '仅允许添加一个可选项'
            let action:string
            if(Object.keys(options).length===0){
                const {input}=await session.prompt({
                    type:'select',
                    name:'input',
                    message:'请选择你要进行的操作',
                    choices:[
                        {
                            title:'启用插件',
                            value:'enable'
                        },
                        {
                            title:'禁用插件',
                            value:'disable'
                        },
                        {
                            title:'安装插件',
                            value:'install'
                        },
                        {
                            title:'卸载插件',
                            value:'remove'
                        }
                    ]
                })
                if(input) action=input
            }else{
                action=Object.keys(options)[0]
            }
            return `你选择的操作是:${action}`
        })
}
