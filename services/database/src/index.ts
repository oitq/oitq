import {Plugin, Service} from "oitq";
import {Sequelize, Model, Options, DataType, ModelStatic} from "sequelize";

export * from 'sequelize'
import {User} from "./models";

export namespace TableColumn {
    export interface Config {
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
}
export type TableDecl = Record<string, DataType | TableColumn.Config>
declare module 'oitq' {
    namespace Plugin {
        interface Services {
            database: Database
        }
    }

    export interface Session {
        user: Database.Models['User']
    }
}
export default class Database extends Service {
    private modelDecl: Record<string, TableDecl> = {}
    public sequelize: Sequelize

    constructor(public plugin: Plugin, public options: Options) {
        super(plugin, 'database')
        this.define('User', User)
    }

    get models(): Record<string, ModelStatic<Model>> {
        return this.sequelize.models
    }

    model(name: string): ModelStatic<Model> {
        return this.models[name]
    }

    start() {
        this.sequelize = new Sequelize({...this.options, logging: (text) => this.logger.debug(text)})
        this.plugin.app.before('start', async () => {
            await this.plugin.app.parallel('before-database.ready')
            Object.entries(this.modelDecl).forEach(([name, decl]) => {
                this.sequelize.define(name, decl,{timestamps:false})
            })
            await this.plugin.app.parallel('before-database.sync')
            await this.sequelize.sync({alter: true})
            this.plugin.app.emit('database.ready')
        })
        this.plugin.app.before('attach', async (session) => {
            const {sender: {nickname, user_id}, user} = session
            if (user) return
            const [userInfo] = await this.models.User.findOrCreate({
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

    extend(name: string, decl: TableDecl) {
        const _decl: TableDecl = this.modelDecl[name]
        if (!decl) return this.define(name, decl)
        Object.assign(_decl, decl)
        return this
    }

    define(name: string, decl: TableDecl) {
        if(this.modelDecl[name]) return this.extend(name,decl)
        this.modelDecl[name] = decl
        return this
    }
}

export namespace Database {
    export interface Models {
        User: User
    }
}
