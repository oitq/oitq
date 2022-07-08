import {isMainThread,parentPort,Worker as ThreadWorker,WorkerOptions} from "worker_threads";
import {App, MainThreadEvent} from "./app";
import {join,dirname} from "path";
import {Plugin} from "./plugin";
import {Bot} from "./bot";
import {ModuleResolver} from "./moduleResolver";
import {removeDir} from "./utils";
export class Worker extends ThreadWorker{
    constructor(id: string, options?: WorkerOptions) {
        let jsFilename: string
        super((() => {
            const moduleResolver = new ModuleResolver(id)
            /**
             * This will return JS file path
             */
            jsFilename = moduleResolver.resolveModule()
            return jsFilename
        })(), options)
        this.on('online', () => {
            try {
                removeDir(dirname(jsFilename))
            } catch (e) {
                console.error(e)
            }
        })
    }
}
export class BotWorker extends Worker {
    constructor(public app:App,uin: number, config: Bot.Config) {
        const bot_path = join(__dirname, 'bot');
        super(bot_path, {
            workerData: { uin, config },
        });

        this
            .once('online', () => {
                app.logger.debug(`bot(${uin}) 线程已创建`);
            })
            .on('error', (error) => {
                app.logger.error(error.message);
            })
            .on('message', (event) => {
                console.log(`主线程收到 bot 消息`, event);
            })
            .on('exit', (code) => {
                app.logger.info(`bot(${uin}) 线程已退出，代码:`, code);
                app.bot_workers.delete(uin)
                if (code) {
                    this.app.logger.info('正在重启...');

                    setTimeout(async () => {
                        const plugin_list = await Plugin.getPluginList();
                        this.app.createBotWorker(uin, config);
                        plugin_list.forEach((name) => {
                            app.linkMessageChannel(uin, name);
                        });
                    }, 3000);
                }
            });
    }
}
export class PluginWorker extends Worker {
    constructor(app:App,info: Plugin.Info) {
        const { name, path } = info;

        super(path, {
            workerData: { name },
        });
        app.plugin_workers.set(name, this);

        this
            .once('online', () => {
                app.logger.debug(`插件 "${name}" 线程已创建`);
            })
            .on('error', (error) => {
                app.logger.error(error.message);
            })
            .on('message', (event) => {
                console.log(`主线程收到 plugin 消息`, event);
            })
            .on('exit', (code) => {
                app.logger.debug(`插件 "${name}" 线程已退出，代码:`, code);
                app.plugin_workers.delete(name)
                if (code) {
                    app.logger.info('正在重启...');

                    setTimeout(() => {
                        app.createPluginWorker(info);
                        const bot_keys = [...app.bot_workers.keys()];

                        bot_keys.forEach((uin) => {
                            app.linkMessageChannel(uin, name);
                        });
                    }, 3000);
                }
            });
    }
}

// 代理主线程通信
export function proxyParentPort() {
    if (isMainThread) {
        throw new Error('当前已在主线程');
    }
    // 事件转发
    parentPort!.on('message', (message: MainThreadEvent) => {
        if (message.name) {
            emitParentPort(message.name, message.event);
        }
    });
}

export function emitParentPort(name: string, event: object) {
    if (isMainThread) {
        throw new Error('当前已在主线程');
    }
    parentPort!.emit(name, event);
}
