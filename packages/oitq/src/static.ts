import * as path from "path";
import * as os from "os";
import {App} from "./app";
import {Bot} from "./bot";

export const dir = path.join(os.homedir(), ".oitq")
export const defaultAppConfig:App.Config={
    prefix:()=>'',
    bots:[],
    maxListeners:50,
    logLevel:'info',
    plugins:{},
    minSimilarity:0.4,
    token:'',
    dir:process.cwd(),
    delay:{
        prompt:60000
    }
}

export const defaultBotConfig:Bot.Config={
    type:'qrcode',
    admins:[],
    master:1659488338,
    config:{
        platform:5,
        data_dir:path.join(dir,'data')
    }
}
