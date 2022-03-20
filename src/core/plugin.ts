import {EventEmitter} from "events";
import * as path from "path";
import * as fs from 'fs'
import {Bot} from "@/core/bot";
import {App} from "@/core/app";
import {merge} from "@/utils";

export interface PluginOptions{
    name:string
    path:string
}
class PluginError extends Error {
    name = "PluginError"
}
export class Plugin extends EventEmitter{
    protected readonly fullpath: string
    readonly binds = new Set<Bot>()
    public app:App
    constructor(public readonly name: string, protected readonly path: string) {
        super()
        this.fullpath = require.resolve(this.path)
    }
    protected async _editBotPluginCache(bot: Bot, method: "add" | "delete") {
        const dir = path.join(bot.dir, "plugin")
        let set: Set<string>
        try {
            const arr = JSON.parse(await fs.promises.readFile(dir, { encoding: "utf8" })) as string[]
            set = new Set(arr)
        } catch {
            set = new Set
        }
        set[method](this.name)
        return fs.promises.writeFile(dir, JSON.stringify(Array.from(set), null, 4))
    }

    async install(app:App){
        this.app=app
        require(this.path)
        const mod = require.cache[this.fullpath]
        if (typeof mod?.exports.install !== "function") {
            throw new PluginError("此插件未导出install方法，无法启用。")
        }
        try {
            const res = mod?.exports.install(app)
            if (res instanceof Promise)
                await res
        } catch (e) {
            throw new PluginError("安装插件时遇到错误。\n错误信息：" + e.message)
        }
    }
    async enable(bot: Bot) {
        if (this.binds.has(bot)) {
            throw new PluginError("这个机器人实例已经启用了此插件")
        }
        const mod = require.cache[this.fullpath]
        if (typeof mod?.exports.enable !== "function") {
            throw new PluginError("此插件未导出enable方法，无法启用。")
        }
        try {
            const res = mod?.exports.enable(bot)
            if (res instanceof Promise)
                await res
            await this._editBotPluginCache(bot, "add")
            this.binds.add(bot)
        } catch (e) {
            throw new PluginError("启用插件时遇到错误。\n错误信息：" + e.message)
        }
    }

    async disable(bot: Bot) {
        if (!this.binds.has(bot)) {
            throw new PluginError("这个机器人实例尚未启用此插件")
        }
        const mod = require.cache[this.fullpath]
        if (typeof mod?.exports.disable !== "function") {
            throw new PluginError("此插件未导出disable方法，无法禁用。")
        }
        try {
            const res = mod?.exports.disable(bot)
            if (res instanceof Promise)
                await res
            await this._editBotPluginCache(bot, "delete")
            this.binds.delete(bot)
        } catch (e) {
            throw new PluginError("禁用插件时遇到错误。\n错误信息：" + e.message)
        }
    }

    async goDie(app:App) {
        const mod = require.cache[this.fullpath] as NodeJS.Module
        try {
            for (let bot of this.binds) {
                await this.disable(bot)
            }
            if (typeof mod.exports.uninstall === "function") {
                const res = mod.exports.uninstall(app)
                if (res instanceof Promise)
                    await res
            }
        } catch { }
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

    async reboot() {
        try {
            await this.goDie(this.app)
            await this.install(this.app)
            require(this.path)
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
    public plugins:Map<string,Plugin>=new Map<string, Plugin>()
    constructor(config:PluginManager.Config) {
        this.config=merge(PluginManager.defaultConfig,config)
    }
    async loadAllPlugins(){
        const plugin_modules: string[] = [], node_modules: string[] = []
        const files = await fs.promises.readdir(
            this.config.dir,
            { withFileTypes: true }
        )
        for (let file of files) {
            if (file.isDirectory() || file.isSymbolicLink()) {
                try {
                    require.resolve(this.config.dir + file.name)
                    plugin_modules.push(file.name)
                } catch { }
            }
        }
        const modules = await fs.promises.readdir(
            path.join(__dirname, "../../node_modules"),
            { withFileTypes: true }
        )
        for (let file of modules) {
            if (file.isDirectory() && (file.name.startsWith("oitq-plugin-") || file.name.startsWith("@oitq/plugin-"))) {
                try {
                    require.resolve(file.name)
                    node_modules.push(file.name)
                } catch { }
            }
        }
        const result=Array.from(new Set(plugin_modules.concat(node_modules)))
        for(const name of this.plugins.keys()){
            if(!result.includes(name))result.push(name)
        }
        return result
    }
}
export namespace PluginManager{
    export const defaultConfig:Config={
        dir:path.join(process.cwd(),'plugins')
    }
    export interface Config{
        dir?:string
    }
}
