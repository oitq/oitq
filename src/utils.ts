import * as path from "path";
import * as fs from "fs";

export function success(data){
    return {
        success:true,
        data
    }
}
export function error(errMsg){
    return {
        success:false,
        msg:errMsg
    }
}
export function merge(head, base) {
    Object.entries(base).forEach(([key, value]) => {
        if (typeof head[key] === 'undefined')
            return head[key] = base[key];
        if (typeof value === 'object' && typeof head[key] === 'object') {
            head[key] = merge(head[key], value);
        }
    });
    return head;
}
export function remove<T>(list: T[], item: T) {
    const index = list.indexOf(item)
    if (index >= 0) {
        list.splice(index, 1)
        return true
    }
}
export async function sleep(timeout){
    return new Promise(resolve => setTimeout(resolve,timeout))
}

export const getAppConfigPath=(dir=process.cwd())=>path.join(dir,'oitq.json')
export const getOneBotConfigPath=(dir=process.cwd())=>path.join(dir,'oneBot.json')
export function readConfig(configPath:string){
    try {
        return JSON.parse(fs.readFileSync(configPath,{encoding:'utf-8'}))
    }catch (e){
        console.error(e)
        return null
    }
}
export function writeConfig(configPath,value={}){
    try {
        fs.writeFileSync(configPath,JSON.stringify(value, null, 4))
        return true
    }catch (e) {
        console.error(e)
        return false
    }
}
export function createIfNotExist(filepath,value={}){
    const dirname = path.dirname(filepath)
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true})
    }
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, JSON.stringify(value, null, 4))
    }
}
