import {App} from "../src";
import {dir, getAppConfigPath, readConfig} from "../src";
import {Sendable} from "oicq";

const app=new App(readConfig(getAppConfigPath(dir)))
app.start(8086)
app.on('bot.message',async (session)=>{
    if(session.raw_message==='mm'){
        await session.reply('你是')
        const result:Sendable=await session.prompt()
        session.reply([].concat('哦，你好',result))
    }

})
