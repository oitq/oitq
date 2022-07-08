import { join } from 'path';
import { Dirent } from 'fs';
import {parentPort, workerData} from 'worker_threads'
import { CronCommand, CronJob } from 'cron';
import { mkdir, readdir } from 'fs/promises';
import {Command} from "./command";
import {DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent} from "oicq";
import {Bot} from "./bot";
import {Return} from "./types";
import {proxyParentPort} from "./worker";
const modules_path = join(__dirname, '../node_modules');
const plugins_path = join(__dirname, 'plugins');
const callApiMap:Map<string,(value:unknown)=>void>=new Map<string, (value:unknown)=>void>()
export class Plugin{
    public name: string=workerData.name;
    private ver: string;
    private jobs: CronJob[]=[];
    private events: Set<string>=new Set<string>('message');
    private botPort: Map<number, MessagePort>=new Map<number, MessagePort>();
    private command_list: Map<string, Command>=new Map<string, Command>();
    constructor(public prefix:string='',option:Plugin.Option={enable:true}) {
        proxyParentPort()
        // 绑定插件线程通信
        parentPort?.on('bind.port', (event) => {
            const { uin, port } = event;
            this.botPort.set(uin, port);
            port.on('message', (data)=>{
                if(data.name){
                    if(data.name==='callApiResult' && data.event.echo){
                        callApiMap.get(data.event.echo)(data.event.result);
                    }
                }
            });
            this.test()
        });
    }
    async test(){
        console.log(await this.callBotApi('getGroupList'))
    }
    private parseCommand(event:PrivateMessageEvent|GroupMessageEvent|DiscussMessageEvent){

    }
    callBotApi<K extends keyof Bot>(method:K,...params:Bot[K] extends (...args:any)=>any?Parameters<Bot[K]>:any[]){
        return new Promise<Return<Bot, K>>(resolve => {
            const echo=new Date().getTime().toString()
            callApiMap.set(echo,resolve)
            this.botPort.forEach(port=>{
                port.postMessage({
                    name: 'callBotApi',
                    event: { method,params,echo },
                })
            })
        })
    }
    version(version:string){
        this.ver=version
        return this
    }
}

export namespace Plugin{
    export interface Info{
        name:string
        path:string
    }
    export interface Option{
        enable?:boolean
        [key:string|symbol]:any
    }
    /**
     * 检索可用插件
     *
     * @returns Promise
     */
    export async function retrievalPlugin() {
        const modules_dir: Dirent[] = [];
        const plugins_dir: Dirent[] = [];
        const modules: Info[] = [];
        const plugins: Info[] = [];

        try {
            const dirs = await readdir(plugins_path, { withFileTypes: true });
            plugins_dir.push(...dirs);
        } catch (error) {
            await mkdir(plugins_path);
        }

        for (const dir of plugins_dir) {
            if (dir.isDirectory() || dir.isSymbolicLink() || dir.isFile()) {
                const name = dir.isFile()?dir.name.replace(/\.m?(t|j)s$/,''):dir.name;
                const path = join(plugins_path, name);

                try {
                    require.resolve(path);
                    const info: Info = {
                        name, path,
                    };
                    plugins.push(info);
                } catch {
                }
            }
        }

        try {
            const dirs = await readdir(modules_path, { withFileTypes: true });
            modules_dir.push(...dirs);
        } catch (err) {
            await mkdir(modules_path);
        }

        for (const dir of modules_dir) {
            if (dir.isDirectory() && dir.name.startsWith('oitq-plugin-')) {
                // 移除文件名前缀
                const name = dir.name.replace('oitq-plugin-', '');
                const path = join(modules_path, name);

                try {
                    require.resolve(path);
                    const info: Info = {
                        name, path,
                    };
                    modules.push(info);
                } catch {
                }
            }
        }

        return {
            modules, plugins,
        };
    }

    export async function getPluginList(): Promise<string[]> {
        const { modules, plugins } = await retrievalPlugin();
        const list = [];

        for (const info of [...modules, ...plugins]) {
            list.push(info.name);
        }
        return list;
    }

}
