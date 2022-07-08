import {Client,Config as Protocol,OnlineStatus} from "oicq";
import {isMainThread, parentPort, workerData, MessagePort} from 'worker_threads';
import {Action, PortMessage} from "./types";
import {deepMerge} from "./utils";
import {join} from "path";
import {MainThreadEvent} from "./app";
import {proxyParentPort} from "./worker";
export class Bot extends Client{
    pluginPort:Map<string,MessagePort>
    admins:number[]
    masters:number[]
    public options:Bot.Config
    constructor(uin:number,config:Bot.Config={}) {
        config=deepMerge(deepMerge(Bot.defaultConfig,config))
        super(uin,config.protocol);
        this.options=config
        this.admins=[].concat(config.admins)
        this.masters=[].concat(config.masters)
        this.pluginPort = new Map();// 绑定插件线程通信
        proxyParentPort()
        parentPort?.on('bind.port', (event: { name: string, port: MessagePort }) => {
            const { name, port } = event;

            // 线程事件代理
            port.on('message', (message: PortMessage) => {
                if (message.name) {
                    port.emit(message.name, message.event);
                }
                this.logger.debug('bot 收到了消息:', message);
            });
            this.bindPluginPort(port);
            this.pluginPort.set(name, port);
        });
    }
    bindPluginPort(port:MessagePort){
        port.on('callBotApi',async (action:Action<Bot, keyof Bot>)=>{
            if(typeof this[action.method]==='function'){
                port.postMessage({
                    name:'callApiResult',
                    event:{
                        echo:action.echo,
                        result:await (this[action["method"]] as Function)(...action.params)
                    }
                })
            }else{
                port.postMessage({
                    name:'callApiResult',
                    event:{
                        echo:action.echo,
                        result:this[action[action.method]]
                    }
                })
            }
        })
    }
    start(){
        if(this.status===OnlineStatus.Online) return
        this.login(this.options.password)
        this.on('system.login.device',()=>{
            console.log('设备验证：请根据提示前往验证地址通过验证后，按回车继续')
            process.stdin.once('data',(d)=>{
                this.login()
            })
        })
        this.on('system.login.qrcode',()=>{
            console.log('扫码登陆：请根据完成扫码后按回车继续')
            // 扫码轮询
            const interval_id = setInterval(async () => {
                const { retcode } = await this.queryQrcodeResult();

                // 0:扫码完成 48:未确认 53:取消扫码
                if (retcode === 0 || ![48, 53].includes(retcode)) {
                    this.login();
                    clearInterval(interval_id);
                }
            }, 2000);
        })
        this.on('system.login.slider',(t)=>{
            console.log('滑块验证：请根据提示前往验证地址通过验证后，输入相应ticket后继续')
            process.stdin.once('data',(d)=>{
                const ticket=d.toString().trim()
                console.log(`你输入的ticket是：${ticket}`)
                this.submitSlider(ticket)
                this.login()
            })
        })
    }
}
export namespace Bot{
    export const defaultConfig:Config={
        protocol:{
            data_dir:join(process.cwd(),'data')
        }
    }
    export interface Config{
        admins?:number|number[]
        masters?:number|number[]
        password?:string
        protocol?:Protocol
    }
}
if(isMainThread){
    throw new Error('不可在主进程创建Bot实例')
}else{
    const {uin,config} = workerData
    const bot=new Bot(uin,config)
    bot.start()
}
