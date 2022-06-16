#!/usr/bin/env node
import {CAC} from "cac";
import registerStartCommand from "./start";
const cli= new CAC('oitq')
cli.version('1.0.2')
registerStartCommand(cli)
cli.help()
cli.parse()
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
