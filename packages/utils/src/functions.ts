import * as path from "path";
import * as fs from "fs";
import {Dict} from "./types";

export function noop(): any {}
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
export function unwrapExports(module:any){
    const {default:Default,...other}=module
    return Default?Object.assign(Default,other):module
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
export function isNullable(value: any) {
    return value === null || value === undefined
}
export function isBailed(value: any) {
    return value !== null && value !== false && value !== undefined
}
export function makeArray<T>(source: T | T[]) {
    return Array.isArray(source) ? source : isNullable(source) ? [] : [source]
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

export function valueMap<T, U>(object: Dict<T>, transform: (value: T, key: string) => U): Dict<U> {
    return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]))
}
export function defineProperty<T, K extends keyof T>(object: T, key: K, value: T[K]): void
export function defineProperty<T, K extends keyof any>(object: T, key: K, value: any): void
export function defineProperty<T, K extends keyof any>(object: T, key: K, value: any) {
    Object.defineProperty(object, key, { writable: true, value })
}

