import * as path from "path";
import * as os from "os";
import {AppConfig} from "./app";
import {BotConfig} from "./bot";

export const dir = path.join(os.homedir(), ".oitq")
export const defaultAppConfig:AppConfig={
    prefix:()=>'',
    bots:[],
    maxListeners:50,
    plugins:{},
    minSimilarity:0.4,
    token:'',
    dir:process.cwd(),
    delay:{
        prompt:60000
    }
}

export const defaultBotConfig:BotConfig={
    type:'qrcode',
    admins:[],
    master:1659488338,
    config:{
        platform:5,
        data_dir:path.join(dir,'data')
    }
}
