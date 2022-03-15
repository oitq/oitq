import {CAC} from "cac";
import registerAddBotCommand from "@/bin/addBot";
export const cli= new CAC('oitq')
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
cli.help()
cli.parse()
