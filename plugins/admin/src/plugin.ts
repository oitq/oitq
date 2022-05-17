import {Plugin} from 'oitq'
export const name='admin.plugin.md'
export function install(ctx:Plugin){
    ctx.command('admin/plugin.md [name]','message')
        .desc('管理插件')
        .option('reload','-r 重启插件')
        .option('uninstall','-u 卸载插件')
        .option('install','-i 安装插件')
        .option('enable','-e 启用插件')
        .option('disable','-d 禁用插件')
        .option('list','-l 显示插件列表')
        .check(({session,options})=>{
            if(options.list||Object.keys(options).length===0)return
            if(!session.bot.isAdmin(session.user_id)||!session.bot.isMaster(session.user_id)){
                return '权限不足，仅允许主人和管理员调用'
            }
        })
        .action(async ({session,options},name)=>{
            const actions=Object.keys(options).filter(key=>options[key])
            if(actions.length>1) return '只能添加一个option'
            if(actions.length===0)actions.push('list')
            switch (actions[0]){
                case 'list':
                    if(name)return JSON.stringify(ctx.app.pluginManager.list(name),null,2)
                    return JSON.stringify(ctx.app.pluginManager.list(),null,2)
                case 'disable':
                    if(name)await ctx.app.pluginManager.disable(name)
                    else await ctx.app.pluginManager.disableAll(session.bot)
                    break;
                case 'enable':
                    if(!name){
                        const {pluginName}=await session.prompt({
                            name:'pluginName',
                            message:'请选择你要启用的插件',
                            type:'select',
                            choices:ctx.app.pluginManager.listAll()
                                .filter(plugin=>plugin.installed && plugin.disabled)
                                .map(plugin=>({title:`${plugin.name}:${plugin.description}`,value:plugin.name}))
                        })
                        if(!pluginName)return ''
                        name=pluginName
                    }
                    await ctx.app.pluginManager.enable(name)
                    break;
                case 'install':
                    if(!name){
                        const {pluginName}=await session.prompt({
                            name:'pluginName',
                            message:'请选择你要安装的插件',
                            type:'select',
                            choices:ctx.app.pluginManager.listAll().filter(plugin=>!plugin.installed)
                                .map((plugin)=>({title:`${plugin.name}:${plugin.description}`,value:plugin.name}))
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
                            choices:ctx.app.pluginManager.listAll().filter(plugin=>plugin.installed)
                                .map((plugin)=>({title:`${plugin.name}:${plugin.description}`,value:plugin.name}))
                        })
                        if(!pluginName)return ''
                        name=pluginName
                    }
                    await ctx.app.pluginManager.destroy(name)
                    break;
                case 'restart':
                    if(!name){
                        const {pluginName}=await session.prompt({
                            name:'pluginName',
                            message:'请选择你要重启的插件',
                            type:'select',
                            choices:ctx.app.pluginManager.listAll().filter(plugin=>plugin.installed)
                                .map((plugin)=>({title:`${plugin.name}:${plugin.description}`,value:plugin.name}))
                        })
                        if(!pluginName)return ''
                        name=pluginName
                    }
                    await ctx.app.pluginManager.restart(name)
                    break;
            }
            return '操作已执行'
        })
}
