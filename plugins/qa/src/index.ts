import {Plugin,Service} from "oitq";
import {QA} from "./models";
import teach from './teach'
import receiver from './receiver'
declare module 'oitq'{
    namespace Plugin{
        interface Services{
            qa:QAManager
        }
    }
}
export const using=['database'] as const
export default class QAManager extends Service{
    constructor(ctx:Plugin) {
        super(ctx,'qa',true)
        ctx.app.before('database.ready',()=>{
            ctx.database.define('QA',QA)
        })
    }
    start(){
        this.plugin.plugin(teach)
        this.plugin.plugin(receiver)
    }
    get logger(){
        return this.plugin.getLogger('qa')
    }
    async addQuestion(question:QA){
        return await this.plugin.database.models.QA.create({...question})
    }
}
