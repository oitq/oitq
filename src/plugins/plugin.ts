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
            const actionMap=[
                {
                    title:'绑定插件',
                    value:'enable'
                },
                {
                    title:'解绑插件',
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
            if(Object.keys(options).length===0){
                const {input}=await session.prompt({
                    type:'select',
                    name:'input',
                    message:'请选择你要进行的操作',
                    choices:actionMap
                })
                if(input) action=input
            }else{
                action=Object.keys(options)[0]
            }
            if(action){
                const {plugins}=await session.prompt({
                    type:'multipleSelect',
                    name:'plugins',
                    message:`请选择你要${actionMap.find(act=>act.value===action).title.slice(0,2)}的插件`,
                    separator:',',
                    choices:ctx.pluginManager.loadAllPlugins().map(status=>{
                        return {
                            title:`${status.name} ${status.isInstall?'已安装':'未安装'} ${status.binds.includes(session.bot.uin)?'已绑定':'未绑定'}`,
                            value:`${status.name}`
                        }
                    })
                })
                if(plugins){
                    return `你选择的操作是${actionMap.find(act=>act.value===action).title}:${plugins.join()}`
                }
            }
        })
}
