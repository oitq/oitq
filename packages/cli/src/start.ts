import {CAC} from "cac";
import {
    App, dir,
    defaultAppOptions, AppOptions, getAppConfigPath,
    readConfig, writeConfig, getOneBotConfigPath, defaultOneBotConfig, getBotConfigPath, defaultBotOptions
} from "oitq";
import {addBot} from "./addBot";
import {createIfNotExist, merge} from "@oitq/utils";
const prompts = require('prompts')
createIfNotExist(getAppConfigPath(dir),defaultAppOptions)
createIfNotExist(getOneBotConfigPath(dir),defaultOneBotConfig)
createIfNotExist(getBotConfigPath(dir),defaultBotOptions)


export default function registerStartCommand(cli: CAC) {
    cli.command('start','启动项目')
        .action(async () => {
            let appOptions: AppOptions = readConfig(getAppConfigPath(dir))
            try {
                if (appOptions.bots.length == 0) {
                    console.log('首次启动，请配置一个账号')
                    await addBot()
                    appOptions = merge(defaultAppOptions,await readConfig(getAppConfigPath(dir)))
                    writeConfig(getAppConfigPath(dir),appOptions)
                    console.log('配置以保存，请重新运行命令以启动')
                    process.exit()
                }
                const app = new App(appOptions)
                if(!appOptions.port){
                    const {port}=await prompts({
                        type:'number',
                        message:'请输入项目监听端口',
                        name:'port'
                    })
                    appOptions.port=port
                }
                await app.start(appOptions.port)
                appOptions.start = true
                writeConfig(getAppConfigPath(dir), appOptions)
            } catch (e) {
                console.log(e.message)
            }
        })
}
