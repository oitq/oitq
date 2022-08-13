import {Base} from "./base";
import {HttpService} from "./services/http";

export class Service extends Base{
    constructor(public name:string,fullPath:string) {
        super('service',name,fullPath)
        this.app.services[name]=this
    }
}
export namespace Service{
    export interface Config{
        http:HttpService.Config
    }
}
