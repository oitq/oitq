import {Context, Dict,NSession} from "oitq";
import {ModelCtor, Sequelize} from "sequelize-typescript";
import {Options} from "sequelize";
export * from 'sequelize-typescript'
import {User} from "./models";
declare module 'oitq'{
    interface Services{
        database:Database
    }
    export interface Session{
        user:User
    }
}
export const name='database'
export function install(ctx:Context,config:Options){
    ctx.database=new Database(ctx,config)
    ctx.on('ready',async ()=>{
        ctx.database.sequelize.addModels(Object.values(this.models))
        await this.sequelize.sync({alter:true})
    })
}
class Database{
    public models:Dict<ModelCtor>={}
    public sequelize:Sequelize
    constructor(public ctx:Context,public options:Options) {
        this.addModels(User)
        this.sequelize=new Sequelize(this.options)
        ctx.before('attach',async (session:NSession<'message'>)=>{
            const {user_id,nickname}=session
            const [user]=await User.findOrCreate({
                attributes:['user_id',"authority",'name'],
                where:{
                    user_id:session.user_id
                },
                defaults:{
                    authority:1,
                    name:nickname,
                    user_id
                }
            })
            session.user=user.toJSON()
        })
    }
    get logger(){
        return this.ctx.logger('database')
    }
    addModels(...models:ModelCtor[]){
        for(const model of models){
            if(this.models[model.name])this.logger.warn(`duplicate model (${model.name}) detected`)
            this.models[model.name]=model
        }
    }
}
Context.service('database')
