import {Awaitable, Dict, Plugin} from "oitq";
import {DataService} from "@oitq/service-console";
import {QA} from "./models";
declare module '@oitq/service-console'{
    namespace Console {
        interface Services {
            qa: QAProvider
        }
    }
}
export default class QAProvider extends DataService<QAProvider.Data[]>{
    static using=['console'] as const
    constructor(plugin:Plugin,config) {
        super(plugin,'qa',config)
        plugin.console.addEntry({
            prod:'../dist',
            dev:'../client/index.ts'
        })
        plugin.app.on('database.ready',async ()=>{
            await this.init()
        })
    }
    async init(){

    }
}
namespace QAProvider {
    export interface Data  extends Partial<QA>{

    }
}
