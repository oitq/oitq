import {CAC} from "cac";
import * as fs from "fs";
import registerAddBotCommand from "./addBot";
import registerStartCommand from "./start";
import registerRemoveCommand from "./removeBot";
import {
    dir,
    getAppConfigPath,AppOptions,defaultAppOptions,
    getOneBotConfigPath,OneBotConfig,defaultOneBotConfig,
    getBotConfigPath,BotOptions,defaultBotOptions,
    createIfNotExist,
    readConfig,writeConfig
} from '@oitq/oitq'
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
createIfNotExist(getAppConfigPath(dir),defaultAppOptions)
createIfNotExist(getOneBotConfigPath(dir),defaultOneBotConfig)
createIfNotExist(getBotConfigPath(dir),defaultBotOptions)
export const cli= new CAC('oitq')
/**
 * 定义异常处理公共函数
 * @param err
 */
const onError = (err: Error): void => {
    console.error(err)
    process.exit(1)
}
// 监听未捕获的异常事件
process.on('uncaughtException', onError)
// 监听Promise未捕获的异常事件
process.on('unhandledRejection', onError)
cli.version('1.0.1')
registerAddBotCommand(cli)
registerStartCommand(cli)
registerRemoveCommand(cli)
cli.help()
cli.parse()
process.on('exit',()=>{
    const appOptions:AppOptions=readConfig(getAppConfigPath(dir))
    appOptions.start=false
    writeConfig(getAppConfigPath(dir),appOptions)
})
