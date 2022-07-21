import {Base} from "./base";
import {HttpService} from "./services/http";
import {App} from "./app";

export class Service extends Base{
    constructor(public name:string,fullPath:string) {
        super('service',name,fullPath)
        this.app.services[name]=this
        return new Proxy(this,{
            defineProperty(target: Service, key: string | symbol, attributes: PropertyDescriptor): boolean {
                // @ts-ignore
                return Object.defineProperty(target.app,key,attributes)
            },
            get(target: Service, p: string | symbol, receiver: any): any {
                if(target[p]!==undefined) return target[p]
                return target.app[p]
            }
        })
    }
}
export interface Service extends App.Services{}
export namespace Service{
    export interface Config{
        http:HttpService.Config
    }
}
