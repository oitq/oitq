#!/usr/bin/env node
import {CAC} from "cac";
import * as fs from "fs";
import registerAddBotCommand from "./addBot";
import registerStartCommand from "./start";
import registerRemoveCommand from "./removeBot";
import {
    dir,
    getAppConfigPath,AppConfig,
    readConfig,writeConfig
} from 'oitq'
import {createIfNotExist} from "@oitq/utils";
import * as path from "path";
const cli= new CAC('oitq')
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

createIfNotExist(path.join(dir,'configFilePath'),dir)
cli.version('1.0.2')
registerAddBotCommand(cli)
registerStartCommand(cli)
registerRemoveCommand(cli)
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
    const appOptions:AppConfig=readConfig(getAppConfigPath(dirReal))
    appOptions.start=false
    writeConfig(getAppConfigPath(dirReal),appOptions)
})
