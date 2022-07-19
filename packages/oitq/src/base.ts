import {Event} from "./event";
import {App} from "./app";
import {Logger} from "log4js";
import {EventMap,Dispose} from "./types";
import * as path from 'path'
import * as fs from "fs";
function loadDependencies(filePath:string){
    const dependencies=[filePath]
    if(fs.statSync(filePath).isFile()) return dependencies
    else dependencies.pop()
    const dirPath=path.dirname(filePath)
    function loadDirDependencies(dir){
        fs.readdirSync(dir,{withFileTypes:true}).forEach(state=>{
            if(state.isFile()){
                dependencies.push(path.join(dir,state.name))
            }else if(state.isDirectory()){
                loadDirDependencies(path.join(dir,state.name))
            }
        })
    }
    loadDirDependencies(dirPath)
    return dependencies
}
export abstract class Base extends Event {
    disposes:Dispose[]=[]
    public logger: Logger
    public app:App
    public config:any
    public dependencies:string[]
    protected constructor(public type:'plugin'|'adapter'|'service', name: string,public fullPath:string) {
        super();
        this.dependencies=loadDependencies(this.fullPath)
        if(!__OITQ__) throw new Error('请先使用createApp创建全局App')
        this.app=__OITQ__
        this.logger = __OITQ__.getLogger(`${type}-${name}`)
        this.config=__OITQ__.config[`${type}s`][name]
        this.on('start',()=>{
            this.app.emit(`${type}.start`,this)
        })
        this.on('dispose',()=>{
            this.app.emit(`${type}.dispose`,this)
        })
    }
    on<K extends keyof EventMap>(name: K, listener: EventMap[K], prepend?: boolean): Dispose
    on<S extends string>(name: S & Exclude<S, keyof EventMap>, listener: (...args: any[]) => any, prepend?: boolean): Dispose{
        const dispose=super.on(name,listener,prepend)
        this.disposes.push(dispose)
        return dispose
    }
    off<K extends keyof EventMap>(name: K, listener: EventMap[K], prepend?: boolean):boolean
    off<S extends string>(name: S & Exclude<S, keyof EventMap>, listener: (...args: any[]) => any, prepend?: boolean):boolean{
        return super.off(name, listener)
    }
    emit<K extends keyof EventMap>(name:K,...args:Parameters<EventMap[K]>)
    emit<S extends string>(name:S & Exclude<S, keyof EventMap>,...args:any[]){
        return super.emit(name,...args)
    }
    async parallel<K extends keyof EventMap>(name:K,...args:Parameters<EventMap[K]>):Promise<void>
    async parallel<S extends string>(name:S & Exclude<S, keyof EventMap>,...args:any[]):Promise<void>{
        return await super.parallel(name,...args)
    }
    async bail<K extends keyof EventMap>(name:K,...args:Parameters<EventMap[K]>):Promise<string|boolean|void>
    async bail<S extends string>(name:S & Exclude<S, keyof EventMap>,...args:any[]):Promise<string|boolean|void>{
        return await super.bail(name,...args)
    }
    before<K extends keyof EventMap>(name: K, listener: EventMap[K], append?: boolean):Dispose
    before<S extends string>(name: S & Exclude<S, keyof EventMap>, listener: (...args: any[]) => any, append?: boolean):Dispose{
        const dispose=super.before(name,listener,append)
        this.disposes.push(dispose)
        return dispose
    }
    dispose(){}
}

export interface Base {
}
