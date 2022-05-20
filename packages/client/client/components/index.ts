import { App } from 'vue'
import {
    ElLoading,
    ElMessage,
} from 'element-plus'
import ElementUI from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import View from './view'
import 'element-plus/dist/index.css'
import './style.scss'

export const loading = ElLoading.service
export const message = ElMessage



export default function (app: App) {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        app.component(key, component)
    }
    app.use(ElementUI, { size: 'small', zIndex: 3000 })
    app.component('k-view', View)
}
