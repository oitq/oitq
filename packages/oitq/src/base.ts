import {Event} from "./event";
import {App} from "./app";
import {Logger} from "log4js";
import {OitqEventMap, Dispose, NSession} from "./types";
import * as path from 'path'
import * as fs from "fs";
import {BotEventMap} from "./adapter";
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
    on(name, listener, prepend?: boolean): Dispose{
        const dispose=super.on(name,listener,prepend)
        this.disposes.push(dispose)
        this.logger.debug('start listen event:'+name)
        return dispose
    }
    before(name, listener, append?: boolean){
        const dispose=super.before(name,listener,append)
        this.disposes.push(dispose)
        return dispose
    }

    dispatch(event:string,...args:any[]){
        this.app.emit(event,...args)
        for(const service of Object.values(this.app.services)){
            service.emit(event as any,...args)
        }
        for(const plugin of Object.values(this.app.plugins)){
            plugin.emit(event as any,...args)
        }
        for(const adapter of Object.values(this.app.adapters)){
            adapter.emit(event as any,...args)
        }
    }
    using(type:'plugin'|'service'|'adapter',...items:string[]):this{
        const proxy=(item)=>{
            const _this=item
            return new Proxy(item,{
                get(target: typeof _this, p: string | symbol, receiver: any): any {
                    const old=Reflect.get(target,p,receiver)
                    if(old && typeof old==='object') return proxy(old)
                    if(typeof old!=="function") return old
                    return (...args:any[])=>{
                        const callback=()=>{
                            if(items.every(s=>Object.keys(__OITQ__[`${type}s`]).includes(s))){
                                dispose()
                                return old.apply(_this,args)
                            }
                        }
                        const dispose=__OITQ__.on(`${type}.start`,callback)
                        callback()
                    }
                }
            })
        }
        return proxy(this)
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

export interface Base {
}
