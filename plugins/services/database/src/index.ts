import {Plugin, Dict, Service} from "oitq";
import {ModelCtor, Sequelize} from "sequelize-typescript";
import {Options} from "sequelize";

export * from 'sequelize-typescript'
import {User, UserInfo} from "./models";

declare module 'oitq' {
    namespace Plugin {
        interface Services {
            database: Database
        }
    }

    export interface Session {
        user: UserInfo
    }
}
export default class Database extends Service {
    private _models: Dict<ModelCtor> = {}
    public sequelize: Sequelize

    constructor(public plugin: Plugin, public options: Options) {
        super(plugin, 'database')
        this.addModels(User)
    }
    get models(){
        return this.sequelize.models
    }
    model(name:string){
        return this.models[name]
    }
    start() {
        this.sequelize = new Sequelize({...this.options, logging: (text) => this.logger.debug(text)})
        this.plugin.app.before('start', async () => {
            await this.plugin.app.parallel('before-database.ready')
            this.sequelize.addModels(Object.values(this._models))
            await this.sequelize.sync({alter: true})
            this.plugin.app.emit('database.ready')
        })
        this.plugin.app.before('attach', async (session) => {
            const {sender: {nickname, user_id}, user} = session
            if (user) return
            const [userInfo] = await User.findOrCreate({
                where: {
                    user_id: session.user_id
                },
                defaults: {
                    authority: 1,
                    name: nickname,
                    user_id,
                    ignore: false
                }
            })
            session.user = userInfo.toJSON()
        })
    }

    stop() {
        this.sequelize.close()
    }

    get logger() {
        return this.plugin.getLogger('database')
    }

    addModels(...models: ModelCtor[]) {
        for (const model of models) {
            if (this._models[model.name]) this.logger.warn(`duplicate model (${model.name}) detected`)
            this._models[model.name] = model
        }
    }
}
