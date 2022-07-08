import {getLogger} from "log4js";
import {Bot} from "./bot";
import {deepClone, deepMerge} from "./utils";
import {BotWorker,PluginWorker} from "./worker";
import {Plugin} from "./plugin";
// 主线程事件
export type MainThreadEvent = {
    name: string;
    event: {};
};
export class App {
    bot_workers:Map<number,BotWorker>=new Map<number, BotWorker>()
    plugin_workers:Map<string,PluginWorker>= new Map<string, PluginWorker>()
    public config:App.Config
    constructor(config:App.Config={}) {
        this.config=deepMerge(deepClone(App.defaultConfig),config)
        this.init()
    }
    get logger(){
        const logger=getLogger('[app]')
        logger.level=this.config.log_level
        return logger
    }
    async init(){
        for(const [u,c] of Object.entries(this.config.bots||{})){
            this.createBotWorker(Number(u),c)
        }
        const { modules, plugins } = await Plugin.retrievalPlugin();
        for (const info of [...modules, ...plugins]) {
            this.createPluginWorker(info);
        };
        const bot_keys = [...this.bot_workers.keys()];
        const plugin_list = await Plugin.getPluginList();

        bot_keys.forEach((uin) => {
            plugin_list.forEach((name) => {
                this.linkMessageChannel(uin, name);
            });
        });
    }
    createBotWorker(uin:number,config:Bot.Config){
        this.bot_workers.set(uin,new BotWorker(this,uin,config))
    }
    createPluginWorker(info:Plugin.Info){
        this.plugin_workers.set(info.name,new PluginWorker(this,info))
    }
    /**
     * 建立双向通信通道
     *
     * @param uin bot 账号
     * @param name 插件名称
     */
    linkMessageChannel(uin: number, name: string): void {
        if (!this.bot_workers.has(uin) || !this.plugin_workers.has(name)) {
            throw new Error('thread is not defined');
        }
        const { port1: botPort, port2: pluginPort } = new MessageChannel();
        const bot_worker = this.bot_workers.get(uin)!;
        const plugin_worker = this.plugin_workers.get(name)!;
        const botPortEvent = {
            name: 'bind.port',
            event: { name, port: pluginPort },
        };
        const pluginPortEvent = {
            name: 'bind.port',
            event: { uin, port: botPort },
        };

        // @ts-ignore
        bot_worker.postMessage(botPortEvent, [pluginPort]);
        // @ts-ignore
        plugin_worker.postMessage(pluginPortEvent, [botPort]);
    }
}
export namespace App{
    export const defaultConfig:Config={
        log_level:'info',
        bots:{}
    }
    export type LogLevel='info'|'warn'|'error'|'mark'|'debug'|'none'
    export interface Config{
        bots?:Record<number, Bot.Config>
        log_level?:LogLevel
    }
}

