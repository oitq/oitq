import { watch } from 'vue'
import { createStorage, message, router, store } from '@oitq/client'
import { UserAuth } from '@oitq/plugin-auth'

interface AuthConfig extends Partial<UserAuth> {
    authType: 'captcha'|'password'
    platform?: string
    userId?: string
    showPass?: boolean
    password?: string
}

export const config = createStorage<AuthConfig>('auth', 1, () => ({
    authType: 'captcha',
}))

watch(() => store.user, (value) => {
    if (!value) {
        return router.push('/login')
    }

    message.success(`欢迎回来，${value.name || 'Oitq 用户'}！`)
    Object.assign(config, value)
    const from = router.currentRoute.value.redirectedFrom
    if (from && !from.path.startsWith('/login')) {
        router.push(from)
    } else {
        router.push('/')
    }
})

export async function sha256(password: string) {
    const data = new TextEncoder().encode(password)
    const buffer = await crypto.subtle.digest('SHA-256', data)
    const view = new DataView(buffer)
    let output = ''
    for (let i = 0; i < view.byteLength; i += 4) {
        output += ('00000000' + view.getUint32(i).toString(16)).slice(-8)
    }
    return output
}
