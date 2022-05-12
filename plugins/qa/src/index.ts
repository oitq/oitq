import {Plugin} from "oitq";
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
export const name='qa'
export const using=['database'] as const
export function install(ctx:Plugin){
    ctx.qa=new QAManager(ctx)
    ctx.plugin({install:teach,name:'teach'})
        .plugin({install: receiver, name: 'answer'})
}
class QAManager{
    constructor(public ctx:Plugin) {
        ctx.database.addModels(QA)
    }
    get logger(){
        return this.ctx.getLogger('database')
    }
    async addQuestion(question:QAInfo){
        return await QA.create({...question})
    }
}
