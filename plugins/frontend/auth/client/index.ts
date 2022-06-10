import {store,Context,send,message,router} from "@oitq/client";
import { config } from './utils'
import Login from './login.vue'
import Profile from './profile.vue'

export default (ctx: Context) => {
    if (config.token && config.expire > Date.now()) {
        send('login/token', Number(config.userId), config.token).catch(e => {
            message.error(typeof e==='string'?e:e.message)
        })
    }
    ctx.disposables.push(
        router.beforeEach((route) => {
        if ((route.meta.authority || route.meta.fields.includes('user')) && !store.user) {
            // handle router.back()
            return history.state.forward === '/login' ? '/' : '/login'
        }

        if (route.meta.authority && route.meta.authority > store.user.authority) {
            message.error('权限不足。')
            return false
        }
    }))

    ctx.addPage({
        path: '/login',
        name: '登录',
        icon: 'avatar',
        position: 'hidden',
        component: Login,
    })

    ctx.addToolkit({
        name: '用户资料',
        icon: 'user',
        fields: ['user'],
        component: Profile,
    })
}
