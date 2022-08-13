import {Event} from "./event";
import {App} from "./app";
import {Logger} from "log4js";
import {OitqEventMap, Dispose} from "./types";
import * as path from 'path'
import * as fs from "fs";
function loadDependencies(filePath:string){
    const dependencies=[filePath]
    if(fs.statSync(filePath).isFile()) return dependencies
    else dependencies.pop()
    function loadDirDependencies(dir){
        fs.readdirSync(dir,{withFileTypes:true}).forEach(state=>{
            if(state.isFile()){
                dependencies.push(path.join(dir,state.name))
            }else if(state.isDirectory()){
                loadDirDependencies(path.join(dir,state.name))
            }
        })
    }
    loadDirDependencies(filePath)
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
            this.dispatch(`${type}.start`,this)
        })
        this.on('dispose',()=>{
            this.dispatch(`${type}.dispose`,this)
        })
    }
    on(name, listener, prepend?: boolean){
        const dispose=super.on(name,listener,prepend)
        this.disposes.push(dispose)
        return dispose
    }
    before(name, listener, append?: boolean){
        const dispose=super.before(name,listener,append)
        this.disposes.push(dispose)
        return dispose
    }
    dispatch(event:string,...args:any[]){
        this.app.emit(event,...args)
    }
    setTimeout(callback:Function,ms:number,...args):Dispose{
        const timer=setTimeout(callback,ms,...args)
        const dispose=()=>{clearTimeout(timer);return true}
        this.disposes.push(dispose)
        return dispose
    }
    setInterval(callback:Function,ms:number,...args):Dispose{
        const timer=setInterval(callback,ms,...args)
        const dispose=()=>{clearInterval(timer);return true}
        this.disposes.push(dispose)
        return dispose
    }
    async sleep(ms:number){
        return new Promise(resolve => {
            this.setTimeout(resolve,ms)
        })
    }
    dispose(){}
}

export interface Base extends Event{
    on<K extends keyof OitqEventMap>(name:K,listener:OitqEventMap[K],prepend?:boolean):Dispose
    on<S extends string|symbol>(name:S & Exclude<S, keyof OitqEventMap>,listener:Function,prepend?:boolean):Dispose
    before<K extends keyof OitqEventMap>(name:K,listener:OitqEventMap[K],append?:boolean):Dispose
    before<S extends string|symbol>(name:S & Exclude<S, keyof OitqEventMap>,listener:Function,append?:boolean):Dispose
}
