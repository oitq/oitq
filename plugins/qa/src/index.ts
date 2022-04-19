import {Context} from "oitq";
import {QAInfo,QA} from "./models";
import teach from './teach'
import receiver from './receiver'
declare module 'oitq'{
    namespace Context{
        interface Services{
            qa:QAManager
        }
    }
}
export const name='qa'
export const using=['database'] as const
export function install(ctx:Context){
    ctx.qa=new QAManager(ctx)
    ctx.plugin(teach, {name:'question'})
        .plugin(receiver, {name:'answer'})
}
class QAManager{
    constructor(public ctx:Context) {
        ctx.database.addModels(QA)
    }
    get logger(){
        return this.ctx.logger('database')
    }
    async addQuestion(question:QAInfo){
        return await QA.create({...question})
    }
}
Context.service('qa')
