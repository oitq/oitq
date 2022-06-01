import { Awaitable, Plugin, omit, pick } from 'oitq'
import { DataService, SocketHandle } from '@oitq/service-console'
import {User,DataTypes} from '@oitq/service-database'
import { resolve } from 'path'
import { v4 } from 'uuid'

declare module '@oitq/service-database' {
    interface User {
        password: string
        token: string
        expire: number
    }
}

declare module '@oitq/service-console' {
    interface SocketHandle {
        user?: UserAuth
    }

    namespace Console {
        interface Services {
            user: AuthService
        }
    }

    interface Events {
        'login/captcha'(this: SocketHandle, user_id:number): Awaitable<UserLogin>
        'login/password'(this: SocketHandle, name: string, password: string): void
        'login/token'(this: SocketHandle, user_id: number, token: string): void
        'user/update'(this: SocketHandle, data: UserUpdate): void
        'user/logout'(this: SocketHandle): void
    }
}

export type UserAuth = Pick<User, 'user_id' | 'name' | 'authority' | 'token' | 'expire'>
export type UserLogin = Pick<User, 'user_id' | 'name' | 'token' | 'expire'>
export type UserUpdate = Partial<Pick<User, 'name' | 'password'>>

const authFields = ['name', 'authority', 'id', 'expire', 'token'] as (keyof UserAuth)[]

function setAuthUser(handle: SocketHandle, value: UserAuth) {
    handle.user = value
    handle.send({ type: 'data', body: { key: 'user', value } })
    handle.refresh()
}

class AuthService extends DataService<UserAuth> {
    static using = ['console', 'database'] as const

    constructor(plugin: Plugin, private config: AuthService.Config) {
        super(plugin, 'user')

        plugin.database.extend('User', {
            password: DataTypes.STRING,
            token: DataTypes.TEXT,
            expire: DataTypes.INTEGER,
        })

        plugin.console.addEntry({
            dev: resolve(__dirname, '../client/index.ts'),
            prod: resolve(__dirname, '../dist'),
        })

        this.initLogin()
    }

    initLogin() {
        const { plugin, config } = this
        const states: Record<string, [string, number, SocketHandle]> = {}

        plugin.console.addListener('login/password', async function (name, password) {
            const userInstance = await plugin.database.model('User').findOne({where:{name},attributes:['password', ...authFields]})
            if(!userInstance)throw new Error('用户名错误。')
            const user=userInstance.toJSON() as User
            if (!user || user.password !== password) throw new Error('密码错误。')
            if (!user.expire || user.expire < Date.now()) {
                user.token = v4()
                user.expire = Date.now() + config.authTokenExpire
                await userInstance.update(pick(user, ['token', 'expire']))
            }
            setAuthUser(this, omit(user, ['password']))
        })

        plugin.console.addListener('login/token', async function (user_id, token) {
            const userInstance = await plugin.database.model('User').findOne({where:{user_id},attributes:authFields})
            if (!userInstance) throw new Error('用户不存在。')
            const user=userInstance.toJSON() as User
            if (user.token !== token || user.expire <= Date.now()) throw new Error('令牌已失效。')
            setAuthUser(this, user)
        })

        plugin.console.addListener('login/captcha', async function (user_id) {
            const userInstance = await plugin.database.model('User').findOne({where:{user_id}})
            if (!userInstance) throw new Error('找不到此账户。')
            const user=userInstance.toJSON()
            const token = v4()
            const expire = Date.now() + config.loginTokenExpire
            states[user_id] = [token, expire, this]

            const listener = () => {
                delete states[user_id]
                dispose()
                this.socket.off('close', listener)
            }
            const dispose = plugin.setTimeout(() => {
                if (states[user_id]?.[1] >= Date.now()) listener()
            }, config.loginTokenExpire)
            this.socket.on('close', listener)

            return { user_id: user.user_id, name: user.name, token, expire }
        })

        plugin.middleware(async (session, next) => {
            const state = states[session.user_id]
            if (state && state[0] === session.cqCode) {
                const {user} = session
                if (!user.expire || user.expire < Date.now()) {
                    user.token = v4()
                    user.expire = Date.now() + config.authTokenExpire
                    await plugin.database.model("User").update({token:v4(),expire:Date.now() + config.authTokenExpire},{where:{user_id:user.user_id}})
                }
                return setAuthUser(state[2], user)
            }
            return next()
        }, true)

        plugin.on('console/intercept', (handle, listener) => {
            if (!listener.authority) return false
            if (!handle.user) return true
            if (handle.user.expire <= Date.now()) return true
            return handle.user.authority < listener.authority
        })

        plugin.console.addListener('user/logout', async function () {
            setAuthUser(this, null)
        })

        plugin.console.addListener('user/update', async function (data) {
            if (!this.user) throw new Error('请先登录。')
            await plugin.database.model('User').update(data,{where: {user_id: this.user.user_id}})
        })
    }
}

namespace AuthService {
    export interface Config {
        authTokenExpire?: number
        loginTokenExpire?: number
    }
}

export default AuthService
