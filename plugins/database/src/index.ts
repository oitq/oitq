import {Plugin,NSession,Dict} from "oitq";
import {ModelCtor, Sequelize} from "sequelize-typescript";
import {Options} from "sequelize";
export * from 'sequelize-typescript'
import {User,UserInfo} from "./models";
declare module 'oitq'{
    namespace App{
        interface Services{
            database:Database
        }
    }
    export interface Session{
        user:UserInfo
    }
}
export const name='database'
export function install(plugin:Plugin,config:Options){
    plugin.app.database=new Database(plugin,config)
    plugin.app.on('ready',async ()=>{
        plugin.app.database.sequelize.addModels(Object.values(plugin.app.database.models))
        await plugin.app.database.sequelize.sync({alter:true})
        plugin.app.emit('database.ready')
    })
}
class Database{
    public models:Dict<ModelCtor>={}
    public sequelize:Sequelize
    constructor(public plugin:Plugin,public options:Options) {
        this.addModels(User)
        this.sequelize=new Sequelize({...this.options,logging:(text)=>this.logger.debug(text)})
        plugin.before('attach',async (session)=>{
            const {sender:{nickname,user_id}}=session
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
        return this.plugin.getLogger('database')
    }
    addModels(...models:ModelCtor[]){
        for(const model of models){
            if(this.models[model.name])this.logger.warn(`duplicate model (${model.name}) detected`)
            this.models[model.name]=model
        }
    }
}
