import {App} from "../src";
import {dir, getAppConfigPath, readConfig} from "../src";

process.on('unhandledRejection', (e) => {
    console.log(e)
})
process.on('uncaughtException', (e) => {
    console.log(e)
})
const app = new App(readConfig(getAppConfigPath(dir)))
app.start(8086)
