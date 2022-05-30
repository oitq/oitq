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
    master:1659488338,
    config:{
        platform:5,
        data_dir:path.join(dir,'data')
    }
}
