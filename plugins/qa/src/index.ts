import {Plugin} from "oitq";
import {QAInfo,QA} from "./models";
import teach from './teach'
import receiver from './receiver'
declare module 'oitq'{
    namespace App{
        interface Services{
            qa:QAManager
        }
    }
}
export const name='qa'
export const using=['database'] as const
export function install(ctx:Plugin){
    ctx.app.qa=new QAManager(ctx)
    ctx.plugin(teach, {name:'question'})
        .plugin(receiver, {name:'answer'})
}
class QAManager{
    constructor(public ctx:Plugin) {
        ctx.app.database.addModels(QA)
    }
    get logger(){
        return this.ctx.getLogger('database')
    }
    async addQuestion(question:QAInfo){
        return await QA.create({...question})
    }
}
