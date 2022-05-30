import * as path from "path";
import {App} from "./app";
import {Bot} from "./bot";

export const dir = process.cwd()
export const defaultAppConfig:App.Config={
    bots:[],
    maxListeners:50,
    logLevel:'info',
    plugins:{},
    delay:{
        prompt:60000
    }
}

export const defaultBotConfig:Bot.Config={
    admins:[],
    config:{},
    master:1659488338,
}
