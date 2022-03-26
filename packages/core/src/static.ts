import * as path from "path";
import * as os from "os";
import {AppOptions} from "./app";
import {BotOptions} from "./bot";

export const dir = path.join(os.homedir(), ".oitq")
export const defaultAppOptions:AppOptions={
    prefix:()=>'',
    bots:[],
    admins:[],
    maxListeners:50,
    plugins:[],
    minSimilarity:0.4,
    token:'',
    logLevel:'debug',
    plugin_dir:path.join(process.cwd(),'plugins'),
    delay:{
        prompt:60000
    }
}

export const defaultBotOptions:BotOptions={
    type:'qrcode',
    admins:[],
    master:1659488338,
    config:{
        platform:5,
        data_dir:path.join(dir,'data'),
        log_level:'debug'
    }
}
