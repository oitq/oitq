import {EventEmitter} from "events";
import * as path from "path";
import * as fs from 'fs'
import {App,Bot} from "@/core";
import {createIfNotExist, merge, Promisify, readConfig, writeConfig} from "@/utils";


class PluginError extends Error {
    name = "PluginError"
}

export enum PluginType{
    Builtin='builtin',// 内置插件
    Official='official',// 官方插件
    Community='community',// 社区插件
    Custom='custom',// 自定义插件
}
export interface PluginDesc{
    name:string
    type:PluginType
    fullName?:string
    desc?:string
    author?:string
    version?:string
    isInstall?:boolean
    binds?:number[]
}
export interface PluginConfig{
    name:string,
    config?:any
}
export class Plugin extends EventEmitter{
    protected readonly fullpath: string
    protected readonly path:string
    protected hooks:PluginManager.Object
    readonly binds = new Set<Bot>()
    private config
    public app:App
    constructor(public readonly name: string,hooks: string|PluginManager.Object) {
        super()
        if(typeof hooks==='string'){
            this.fullpath = require.resolve(hooks)
            this.path=hooks
        }else{
            this.hooks=hooks
        }
    }
    protected async _editBotPluginCache(bot: Bot, method: "add" | "delete") {
        const dir = path.join(bot.dir, "plugin")
        createIfNotExist(dir,[])
        let set: Set<string>
        try {
            const arr = readConfig(dir) as string[]
            set = new Set(arr)
        } catch {
            set = new Set
        }
        set[method](this.name)
        return writeConfig(dir,Array.from(set))
    }
    async install(app:App,config?:any){
        this.config=config
        this.app=app
        if(this.path){
            require(this.path)
            const mod = require.cache[this.fullpath] as {exports:PluginManager.Object}
            this.hooks=mod.exports
        }
        if (typeof this.hooks.install !== "function") {
            throw new PluginError("此插件未导出install方法，无法启用。")
        }
        try {
            const res = this.hooks.install(app,config)
            if (res instanceof Promise)
                await res
            console.log(`插件${this.name} 已成功安装`)
        } catch (e) {
            throw new PluginError("安装插件时遇到错误。\n错误信息：" + e.message)
        }
    }
    async enable(bot: Bot) {
        if (this.binds.has(bot)) {
            throw new PluginError("这个机器人实例已经启用了此插件")
        }
        if(this.path){
            require(this.path)
            const mod = require.cache[this.fullpath] as {exports:PluginManager.Object}
            this.hooks=mod.exports
        }
        if (typeof this.hooks.enable !== "function") {
            throw new PluginError("此插件未导出enable方法，无法启用。")
        }
        try {
            const res = this.hooks.enable(bot)
            if (res instanceof Promise)
                await res
            await this._editBotPluginCache(bot, "add")
            this.binds.add(bot)
            console.log(`插件${this.name} 成功对机器人${bot.uin}启用`)
        } catch (e) {
            throw new PluginError("启用插件时遇到错误。\n错误信息：" + e.message)
        }
    }

    async disable(bot: Bot) {
        if (!this.binds.has(bot)) {
            throw new PluginError("这个机器人实例尚未启用此插件")
        }
        if(this.path){
            require(this.path)
            const mod = require.cache[this.fullpath] as {exports:PluginManager.Object}
            this.hooks=mod.exports
        }
        if (typeof this.hooks.disable !== "function") {
            throw new PluginError("此插件未导出disable方法，无法禁用。")
        }
        try {
            const res = this.hooks.disable(bot)
            if (res instanceof Promise)
                await res
            await this._editBotPluginCache(bot, "delete")
            this.binds.delete(bot)
            console.log(`插件${this.name} 成功对机器人${bot.uin}禁用`)
        } catch (e) {
            throw new PluginError("禁用插件时遇到错误。\n错误信息：" + e.message)
        }
    }

    async uninstall(app:App) {
        let isModule=false,mod:NodeJS.Module
        if(this.path){
            isModule=true
            require(this.path)
            mod = require.cache[this.fullpath] as NodeJS.Module
            this.hooks=mod.exports
        }
        try {
            for (let bot of this.binds) {
                await this.disable(bot)
            }
            if (typeof this.hooks.uninstall === "function") {
                const res = this.hooks.uninstall(app)
                if (res instanceof Promise)
                    await res
                console.log(`插件${this.name} 已成功卸载`)
            }
        } catch { }
        if(isModule){
            const ix = mod.parent?.children?.indexOf(mod) as number;
            if (ix >= 0)
                mod.parent?.children.splice(ix, 1);
            for (const fullpath in require.cache) {
                if (require.cache[fullpath]?.id.startsWith(mod.path)) {
                    delete require.cache[fullpath]
                }
            }
            delete require.cache[this.fullpath];
        }
    }

    async restart() {
        try {
            await this.uninstall(this.app)
            await this.install(this.app,this.config)
            for (let bot of this.binds) {
                await this.enable(bot)
            }
        } catch (e) {
            throw new PluginError("重启插件时遇到错误。\n错误信息：" + e.message)
        }
    }
}
export class PluginManager{
    public config:PluginManager.Config
    public plugins:Map<string,Plugin>=new Map<string,Plugin>()
    constructor(public app:App,config:PluginManager.Config) {
        this.config=merge(PluginManager.defaultConfig,config)
        const builtinPath=path.join(__dirname,'../plugins')
        const builtins=fs.readdirSync(builtinPath,{withFileTypes:true})
        // 安装内置插件
        for(let file of builtins){
            let fileName=file.name
            if(file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.js'))) {
                fileName = file.name.replace(/\.ts|\.js/, '')
            }
            this.install(fileName,new Plugin(file.name,`${builtinPath}/${file.name}`))
        }
        for(const conf of this.config.plugins){
            this.import(conf.name).install(app,conf.config)
        }
    }

    import(name:string){
        if (this.plugins.has(name))
            return this.plugins.get(name)
        let resolved = ""
        if(!resolved){
            const files = fs.readdirSync(
                this.config.dir,
                { withFileTypes: true }
            )
            for (let file of files) {
                if ((file.isDirectory() || file.isSymbolicLink()) && file.name === name) {
                    resolved = `${this.config.dir}/${file.name}`
                }
            }
        }
        if (!resolved) {
            const modulePath=path.join(__dirname, "../../node_modules")
            const orgPath=path.resolve(modulePath,'@oitq')
            const modules =fs.readdirSync(modulePath,{ withFileTypes: true })
            let existOrgModule:boolean=false
            for (let file of modules) {
                if (file.isDirectory() && (file.name === name || file.name === `oitq-plugin-${name}`)) {
                    resolved = file.name
                }else if(file.isDirectory() && file.name==='@oitq')existOrgModule=true
            }
            if(existOrgModule){
                const orgModules=fs.readdirSync(orgPath,{withFileTypes:true})
                for (let file of orgModules) {
                    if (file.isDirectory() && file.name === `plugin-${name}`) {
                        resolved = `@oitq/${file.name}`
                    }
                }
            }
        }
        if (!resolved)
            throw new PluginError("插件名错误，无法找到此插件")
        return new Plugin(name, resolved)
    }
    install(name:string,plugin:Plugin,config?){
        plugin.install(this.app,config)
        this.plugins.set(name,plugin)
    }
    checkInstall(name:string){
        if (!this.plugins.has(name)) {
            throw new PluginError("尚未安装此插件")
        }
        return this.plugins.get(name)
    }
    async uninstall(name:string){
        this.checkInstall(name).uninstall(this.app)
        this.plugins.delete(name)
    }
    restart(name:string){
        return this.checkInstall(name).restart()
    }
    enable(name:string,bot:Bot){
        return this.checkInstall(name).enable(bot)
    }
    disable(name:string,bot:Bot){
        return this.checkInstall(name).disable(bot)
    }
    async disableAll(bot:Bot){
        for (let [_, plugin] of this.plugins) {
            try {
                await plugin.disable(bot)
            } catch { }
        }
    }
    loadAllPlugins():PluginDesc[]{
        const custom_plugins: PluginDesc[] = [], module_plugins: PluginDesc[] = [],builtin_plugins:PluginDesc[]=[]
        const modulePath=path.join(__dirname, "../../node_modules")
        const orgPath=path.resolve(modulePath,'@oitq')
        let existOrgModule:boolean
        // 列出的插件不展示内置插件
        const builtinPath=path.join(__dirname,'../plugins')
        const builtinPlugins=fs.readdirSync(builtinPath,{withFileTypes:true})
        for(let file of builtinPlugins){
            if(file.isDirectory()){
                try{
                    require.resolve(`${builtinPath}/${file.name}`)
                    builtin_plugins.push({
                        name:file.name,
                        type:PluginType.Builtin
                    })
                }catch{}
            }
        }
        const customPlugins = fs.readdirSync(this.config.dir,{ withFileTypes: true })
        for (let file of customPlugins) {
            if (file.isDirectory() || file.isSymbolicLink()) {
                try {
                    require.resolve(`${this.config.dir}/${file.name}`)
                    custom_plugins.push({
                        name:file.name,
                        type:PluginType.Custom
                    })
                }catch{}
            }
        }
        const modules = fs.readdirSync(modulePath,{ withFileTypes: true })
        for (let file of modules) {
            if (file.isDirectory() && (file.name.startsWith("oitq-plugin-"))) {
                try {
                    require.resolve(file.name)
                    module_plugins.push({
                        name:file.name.replace('oitq-plugin-',''),
                        type:PluginType.Community,
                        fullName:file.name
                    })
                } catch { }
            }else if(file.isDirectory() && file.name==='@oitq')existOrgModule=true
        }
        if(existOrgModule){
            const orgModules=fs.readdirSync(orgPath,{ withFileTypes: true })
            for (let file of orgModules) {
                if (file.isDirectory() && (file.name.startsWith("plugin-"))) {
                    try {
                        require.resolve(`@oitq/${file.name}`)
                        module_plugins.push({
                            name:file.name.replace('plugin-',''),
                            type:PluginType.Official,
                            fullName:`@oitq/${file.name}`
                        })
                    } catch { }
                }
            }
        }
        const plugins:PluginDesc[]=[...this.plugins.values()].map(plugin=>{
            return {
               name:plugin.name,
                type:PluginType.Custom
            }
        }).filter(plugin=>{
            return !custom_plugins.map(desc=>desc.name).includes(plugin.name) &&
                !module_plugins.map(desc=>desc.name).includes(plugin.name) &&
                !builtin_plugins.map(desc=>desc.name).includes(plugin.name)
        })
        return builtin_plugins.concat(custom_plugins).concat(module_plugins).concat(plugins).map(pluginDesc=> {
            const plugin = this.plugins.get(pluginDesc.name)
            return {
                ...pluginDesc,
                isInstall: this.plugins.has(pluginDesc.name),
                binds: plugin ? Array.from(plugin.binds).map(bot => bot.uin) : []
            }
        })
    }

    /**
     * 恢复bot的插件服务
     * @param {Bot} bot
     */
    async restore(bot:Bot){
        const dir = path.join(bot.dir, "plugin")
        try {
            const arr = readConfig(dir) as string[]
            for (let name of arr) {
                try {
                    await this.checkInstall(name).enable(bot)
                } catch { }
            }
        } catch { }
        return this.plugins
    }
}
export namespace PluginManager{
    export const defaultConfig:Config={
        dir:path.join(process.cwd(),'plugins'),
        plugins:[]
    }
    export type Object={
        install?(ctx:App,config?):Promisify<any>
        uninstall?(ctx:App):Promisify<any>
        enable?(bot:Bot):Promisify<any>
        disable?(bot:Bot):Promisify<any>
    }
    export interface Config{
        dir?:string,
        plugins?:PluginConfig[]
    }
}
