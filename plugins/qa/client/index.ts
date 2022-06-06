import {Context} from "@oitq/client";
import QA from "./manage.vue";
export default (ctx:Context)=>{
    ctx.addPage({
        path: '/qa',
        name: '问答管理',
        icon: 'setting',
        fields: ['qa'],
        order: 640,
        authority: 4,
        component: QA,
    })
}
