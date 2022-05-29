import {Context} from "@oitq/client";
import Bots from './bots/index.vue'
import Plugins from './plugins/index.vue'
import Shop from './shop/index.vue'
import Dependency from "./dependency/index.vue";
import { overrideCount } from './utils'
export default (ctx:Context)=>{
    ctx.addPage({
        path: '/bots',
        name: '机器人',
        icon: 'user',
        order: 640,
        authority: 4,
        fields: ['bots'],
        component: Bots,
    })

    ctx.addPage({
        path: '/settings',
        name: '配置',
        icon: 'setting',
        fields: ['packages', 'dependencies'],
        order: 630,
        authority: 4,
        component: Plugins,
    })

    ctx.addPage({
        path: '/shop',
        name: '市场',
        icon: 'goods',
        order: 620,
        authority: 4,
        fields: ['shop', 'packages'],
        component: Shop,
    })

    ctx.addPage({
        path: '/deps',
        name: '依赖管理',
        icon: 'paperclip',
        order: 610,
        authority: 4,
        component: Dependency,
        fields: ['shop', 'dependencies'],
        badge: () => overrideCount.value,
    })
}

