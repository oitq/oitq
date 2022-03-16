import {CAC} from "cac";
import * as path from "path";
import * as fs from "fs";
import * as os from 'os'
import {defaultOneBotConfig} from "@/onebot";
import {getAppConfigPath, createIfNotExist, getOneBotConfigPath} from "@/utils";
export const dir = path.join(os.homedir(), ".oitq");
createIfNotExist(getAppConfigPath(dir),{bots:[]})
createIfNotExist(getOneBotConfigPath(dir),defaultOneBotConfig)
import registerAddBotCommand from "@/bin/addBot";
import registerStartCommand from "@/bin/start";
import registerRemoveCommand from "@/bin/removeBot";
export const cli= new CAC('oitq')
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
/**
 * 定义异常处理公共函数
 * @param err
 */
const onError = (err: Error): void => {
    console.error(err.message)
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
