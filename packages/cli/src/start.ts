import {CAC} from "cac";
import {App,dir,
    defaultAppOptions,AppOptions,getAppConfigPath,
    readConfig,writeConfig
} from "@oitq/oitq";
import {addBot} from "./addBot";
import {removeBot} from "./removeBot";

const prompts = require('prompts')
let appOptions: AppOptions = readConfig(getAppConfigPath(dir))

function loop(app: App) {
    process.stdin.on("data", async (buf: Buffer) => {
        if (typeof buf === 'boolean') return
        const input = buf?.toString().trim()
        if (!input) return;
        const cmd = input.split(" ")[0];
        const param = input.replace(cmd, "").trim();
        switch (input) {
            case 'add':
                addBot()
                break;
            case 'remove':
                removeBot();
                break;
            case 'quit':
                process.exit(1)
                break;
            case 'eval':
                try {
                    let res = await eval(param);
                    console.log("Result:", res);
                } catch (e) {
                    throw e
                }
                break;
            case 'send':
                const {uin, method, id, message} = await prompts([
                    {
                        type: 'select',
                        name: 'uin',
                        message: '请指定发送的bot',
                        choices: app.bots.map(bot => ({title: `${bot.nickname}(${bot.uin})`, value: bot.uin}))
                    },
                    {
                        type: 'select',
                        name: 'method',
                        message: '请选择发送的消息类型',
                        choices: [
                            {
                                title: '群消息',
                                value: 'sendGroupMsg'
                            },
                            {
                                title: '私聊消息',
                                value: 'sendPrivateMsg'
                            }
                        ],
                        initial: 1
                    }, {
                        type: 'number',
                        name: 'id',
                        message: prev => prev === 'sendGroupMsg' ? '请输入群id' : '请输入用户id'
                    },
                    {
                        type: 'text',
                        name: 'message',
                        message: '请输入消息内容'
                    }
                ])
                app.bots.get(uin)[method](id, message)
        }
    })
}

export default function registerStartCommand(cli: CAC) {
    cli.command('start','启动项目')
        .action(async () => {
            try {
                if (appOptions.bots.length == 0) {
                    console.log('首次启动，请配置一个账号')
                    await addBot()
                    appOptions = await readConfig(getAppConfigPath(dir))
                }
                const app = new App(appOptions)
                await app.start()
                appOptions.start = true
                writeConfig(getAppConfigPath(dir), appOptions)
                loop(app)
            } catch (e) {
                console.log(e.message)
            }
        })
}
