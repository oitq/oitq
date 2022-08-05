import {Service} from "oitq";
import {Sequelize, Model, Options, DataType,DataTypes, ModelStatic} from 'sequelize'
declare module 'oitq'{
    namespace App{
        interface Services{
            database:Database
        }
    }
}
export interface TableColumn{
    allowNull?: boolean
    field?: string
    defaultValue?: unknown
    type: DataType;
    unique?: boolean | string | { name: string; msg: string };
    primaryKey?: boolean;
    autoIncrement?: boolean;
    autoIncrementIdentity?: boolean;
    comment?: string;
    get?(): unknown
    set?(value: unknown): void
}
export type TableDecl = Record<string, DataType | TableColumn>
class Database{
    private modelDecl: Record<string, TableDecl> = {}
    public sequelize: Sequelize
    get models(): Record<string, ModelStatic<Model>> {
        return this.sequelize.models
    }
    constructor(public service:Service,protected options:Options) {
        this.define('User', User)
        this.sequelize=new Sequelize({logging:(text)=>this.service.logger.debug(text), ...options})
        if(this.service.app.started){
            this.start()
        }else{
            this.service.app.before('start', this.start.bind(this))
        }
        this.service.app.before('attach', async (session) => {
            const {sender: {nickname, user_id}, user} = session
            if (user) return
            const [userInfo] = await this.models.User.findOrCreate({
                where: {
                    user_id: session.user_id
                },
                defaults: {
                    authority: session.bot.isMaster(session.user_id)?7:session.bot.isAdmin(session.user_id)?4:1,
                    name: nickname,
                    user_id,
                    ignore: false
                }
            })
            session.user = userInfo.toJSON()
        })
    }
    model(name: string): ModelStatic<Model> {
        return this.models[name]
    }
    extend(name: string, decl: TableDecl) {
        const _decl: TableDecl = this.modelDecl[name]
        if (!decl) return this.define(name, decl)
        Object.assign(_decl, decl)
        return this
    }
    async start(){
        Object.entries(this.modelDecl).forEach(([name, decl]) => {
            this.sequelize.define(name, decl,{timestamps:false})
        })
        await this.sequelize.sync({alter: true})
    }
    async stop(){
        await this.sequelize.close();
    }
    define(name: string, decl: TableDecl) {
        if(this.modelDecl[name]) return this.extend(name,decl)
        this.modelDecl[name] = decl
        return this
    }

}

export interface User{
    id:number
    user_id:number
    authority:number
    name:string
    ignore:boolean
}
export const User:TableDecl={
    user_id:DataTypes.DECIMAL,
    authority:DataTypes.INTEGER,
    name:DataTypes.STRING,
    ignore:DataTypes.BOOLEAN
}
const service=new Service('database',__filename)
const config:Options=service.config
if(!config) throw new Error('database service need some config')
service.app.database=new Database(service,config)
service.on('dispose',()=>{
    service.app.database.stop()
})

