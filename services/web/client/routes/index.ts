import {createRouter, createWebHistory, RouteRecordRaw} from "vue-router";
const routes:Array<RouteRecordRaw>=[
    {
        path:'/',
        component:()=>import('../views/Home.vue')
    }
]
export const router=createRouter({
    history:createWebHistory(),
    routes
})
