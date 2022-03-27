import {Context, Dict} from "oitq";
import {Question} from "./models";
declare module 'oitq'{
    namespace Context{
        interface Services{
            qa:QA
        }
    }
}
export const name='qa'
export const using=['database'] as const
export function install(ctx:Context){
    ctx.qa=new QA(ctx)
}
class QA{
    constructor(public ctx:Context) {
        ctx.database.addModels(Question)
    }
    get logger(){
        return this.ctx.logger('database')
    }
    async addQuestion(question:Question){
        return await Question.create({})
    }
}
Context.service('qa')
