import { App } from 'vue'
import {
    ElButton,
    ElCheckbox,
    ElDatePicker,
    ElDropdown,
    ElDropdownItem,
    ElDropdownMenu,
    ElInput,
    ElInputNumber,
    ElLoading,
    ElMessage,
    ElPagination,
    ElPopconfirm,
    ElRadio,
    ElScrollbar,
    ElSelect,
    ElSlider,
    ElSwitch,
    ElTable,
    ElTableColumn,
    ElTimePicker,
    ElTooltip,
    ElTree,
} from 'element-plus'

import View from './view'

import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/checkbox/style/css'
import 'element-plus/es/components/dropdown/style/css'
import 'element-plus/es/components/dropdown-item/style/css'
import 'element-plus/es/components/dropdown-menu/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/input-number/style/css'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/scrollbar/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/slider/style/css'
import 'element-plus/es/components/switch/style/css'
import 'element-plus/es/components/tooltip/style/css'
import 'element-plus/es/components/tree/style/css'
import 'element-plus/es/components/table/style/css'
import 'element-plus/es/components/table-column/style/css'
import 'element-plus/es/components/pagination/style/css'
import 'element-plus/es/components/popconfirm/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/time-picker/style/css'
import './style.scss'

export const loading = ElLoading.service
export const message = ElMessage



export default function (app: App) {
    app.use(ElButton)
    app.use(ElCheckbox)
    app.use(ElDatePicker)
    app.use(ElDropdown)
    app.use(ElDropdownItem)
    app.use(ElDropdownMenu)
    app.use(ElInput)
    app.use(ElInputNumber)
    app.use(ElLoading)
    app.use(ElPagination)
    app.use(ElPopconfirm)
    app.use(ElRadio)
    app.use(ElScrollbar)
    app.use(ElSelect)
    app.use(ElSlider)
    app.use(ElSwitch)
    app.use(ElTooltip)
    app.use(ElTree)
    app.use(ElTable)
    app.use(ElTableColumn)
    app.use(ElTimePicker)
    app.component('k-view', View)
}
