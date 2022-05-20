import {Plugin,Service} from "oitq";
import {QAInfo,QA} from "./models";
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
        super(ctx,'qa')
        ctx.app.before('database.ready',()=>{
            ctx.database.addModels(QA)
        })
    }
    start(){
        this.plugin.plugin({install:teach,name:'teach'})
        this.plugin.plugin({install: receiver, name: 'answer'})
    }
    get logger(){
        return this.plugin.getLogger('qa')
    }
    async addQuestion(question:QAInfo){
        return await QA.create({...question})
    }
}
