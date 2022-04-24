import {Context} from 'oitq'
export const name='admin.plugin'
export function install(ctx:Context){
    ctx.command('admin/plugin [name]','管理插件')
        .option('reload','-r 重启插件')
        .option('uninstall','-u 卸载插件')
        .option('install','-i 安装插件')
        .option('enable','-e 启用插件')
        .option('disable','-d 禁言插件')
        .option('list','-l 显示插件列表')
        .action(async ({session,options},name)=>{
            const actions=Object.keys(options).filter(key=>options[key])
            if(actions.length>1) return '只能添加一个option'
            if(actions.length===0)actions.push('list')
            switch (actions[0]){
                case 'list':
                    return JSON.stringify(ctx.pluginManager.loadAllPlugins(),null,2)
                case 'disable':
                    if(name)await ctx.pluginManager.disable(name,session.bot)
                    else await ctx.pluginManager.disableAll(session.bot)
                    break;
                case 'enable':
                    if(!name){
                        const {pluginName}=await session.prompt({
                            name:'pluginName',
                            message:'请选择你要启用的插件',
                            type:'select',
                            choices:ctx.pluginManager.loadAllPlugins().filter(plugin=>plugin.isInstall && !plugin.binds.includes(session.bot.uin))
                                .map((plugin)=>({title:plugin.fullName,value:plugin.name}))
                        })
                        if(!pluginName)return ''
                        name=pluginName
                    }
                    await ctx.pluginManager.enable(name,session.bot)
                    break;
                case 'install':
                    if(!name){
                        const {pluginName}=await session.prompt({
                            name:'pluginName',
                            message:'请选择你要安装的插件',
                            type:'select',
                            choices:ctx.pluginManager.loadAllPlugins().filter(plugin=>!plugin.isInstall)
                                .map((plugin)=>({title:plugin.fullName,value:plugin.name}))
                        })
                        if(!pluginName)return ''
                        name=pluginName
                    }
                    await ctx.plugin(name)
                    break;
                case 'uninstall':
                    if(!name){
                        const {pluginName}=await session.prompt({
                            name:'pluginName',
                            message:'请选择你要卸载的插件',
                            type:'select',
                            choices:ctx.pluginManager.loadAllPlugins().filter(plugin=>plugin.isInstall)
                                .map((plugin)=>({title:plugin.fullName,value:plugin.name}))
                        })
                        if(!pluginName)return ''
                        name=pluginName
                    }
                    await ctx.pluginManager.uninstall(name)
                    break;
                case 'restart':
                    if(!name){
                        const {pluginName}=await session.prompt({
                            name:'pluginName',
                            message:'请选择你要重启的插件',
                            type:'select',
                            choices:ctx.pluginManager.loadAllPlugins().filter(plugin=>plugin.isInstall)
                                .map((plugin)=>({title:plugin.fullName,value:plugin.name}))
                        })
                        if(!pluginName)return ''
                        name=pluginName
                    }
                    await ctx.pluginManager.restart(name)
                    break;
            }
            return '操作已执行'
        })
}
