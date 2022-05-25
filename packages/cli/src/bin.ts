#!/usr/bin/env node
import {CAC} from "cac";
import * as fs from "fs";
import registerStartCommand from "./start";
import {
    dir,
    getAppConfigPath,App,
    readConfig,writeConfig
} from 'oitq'
import {createIfNotExist} from "@oitq/utils";
import * as path from "path";
const cli= new CAC('oitq')
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

createIfNotExist(path.join(dir,'configFilePath'),dir)
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
process.on('exit',()=>{
    const dirReal=readConfig(path.join(dir,'configFilePath'))
    const appOptions:App.Config=readConfig(getAppConfigPath(dirReal))
    writeConfig(getAppConfigPath(dirReal),appOptions)
})
