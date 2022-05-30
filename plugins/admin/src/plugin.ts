import {Plugin,template} from 'oitq'
template.set('plugins',{
    plugin:{
        info:'    插件名:${0}\n  已安装？:${1}\n    已禁用？:${2}\n',
        detail:'插件名:${0}\n类型:${1}当前版本:${2}\n作者:${3}\n'
    },
    list:`相关插件：\n${0}`
})
export const name='admin.plugin'
export function install(ctx:Plugin){
    ctx.command('admin/plugin [name]','message')
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
                    const list=ctx.app.pluginManager.list(name)
                    if(name)return template('plugins.list',list.map(plugin=>template('plugins.info',plugin.name,plugin.installed,plugin.disabled)).join('\n'))
                    return template('plugins.list',list.map(plugin=>template('plugins.info',plugin.name,plugin.installed,plugin.disabled)).join('\n'))
                case 'disable':
                    if(name)await ctx.app.pluginManager.disable(name)
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
