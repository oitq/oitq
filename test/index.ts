import {App} from "../src";
import {dir, getAppConfigPath, readConfig} from "../src";
import {ImageElem} from "oicq";

process.on('unhandledRejection', (e) => {
    console.log(e)
})
process.on('uncaughtException', (e) => {
    console.log(e)
})
const app = new App(readConfig(getAppConfigPath(dir)))
app.start(8086)
app.on('bot.message', async (session) => {
    if (session.raw_message === 'sum') {
        const arr=await session.prompt({
            type:'date',
            name:'出生日期',
        }) as Date
        session.reply(arr.toLocaleString())
    }

})
