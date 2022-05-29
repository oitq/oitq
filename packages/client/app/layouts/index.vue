<template>
  <el-container style="height: 100vh">
    <el-aside class="layout-aside" v-if="!sidebarHidden" width="auto">
      <transition name="slide">
        <h5 class="aside-title" style="text-align: center">oitq</h5>
      </transition>
      <el-scrollbar height="100vh - 64px">
        <el-menu router :collapse="isCollapse">
          <asideSubMenu v-for="menu in getRoutes('top')" :menu="menu" :key="menu.path">{{menu}}</asideSubMenu>
        </el-menu>
      </el-scrollbar>
      <el-affix position="bottom" class="aside-control">
        <el-icon @click="toggle">
          <Sunny v-if="isDark"/>
          <Opportunity  v-else/>
        </el-icon>
        <el-icon @click="toggleCollapse">
          <Expand  v-if="isCollapse"/>
          <Fold v-else/>
        </el-icon>
      </el-affix>
    </el-aside>
    <el-container>
      <el-header height="40px">
        <div class="toolbar">
          <el-dropdown>
            <el-icon style="margin-right: 8px; margin-top: 1px">
              <setting/>
            </el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>Tom</el-dropdown-item>
                <el-dropdown-item>Info</el-dropdown-item>
                <el-dropdown-item>Logout</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <router-view v-if="loaded" #="{ Component }">
          <keep-alive>
            <component :is="Component"/>
          </keep-alive>
        </router-view>
        <div class="loading" v-else v-loading="true" element-loading-text="正在加载数据……"></div>
      </el-main>
    </el-container>
  </el-container>
  <k-view name="global"></k-view>
</template>

<script lang="ts" setup>
import {store} from '@oitq/client'
import {computed, ref} from 'vue'
import {useRoute} from 'vue-router'
import { routes, getValue } from '@oitq/client'
import { useDark } from '@vueuse/core'
import asideSubMenu from './subMenu.vue'
function getRoutes(position: 'top' | 'bottom') {
  const scale = position === 'top' ? 1 : -1
  return routes.value
      .filter(r => getValue(r.meta.position) === position)
      .sort((a, b) => scale * (b.meta.order - a.meta.order))
}
const isDark = useDark()
function toggle() {
  isDark.value = !isDark.value
}
function toggleCollapse(){
  isCollapse.value=!isCollapse.value
  localStorage.setItem('collapsed',JSON.stringify(isCollapse.value))
  console.log(JSON.parse(localStorage.getItem('collapsed')))
}
const route = useRoute()
const loaded = computed(() => {
  if (!route.meta.fields) return true
  return route.meta.fields.every((key) => store[key])
})
const isCollapse=ref(JSON.parse(localStorage.getItem('collapsed'))||false)
const sidebarHidden = computed(() => {
  return route.meta.position === 'hidden'
})
</script>

<style lang="scss">
html,body{
  margin: 0;
  padding: 0;
  background-color: var(--el-bg-color);
}
.aside-control{
  height: 32px;
  .el-icon{
    display: inline-block;
    width: 50%;
    height: 32px;
    margin: 0;
    text-align: center;
    cursor: pointer;
  }
}
.aside-title{
  margin: 0;
  height: 32px;
  font-size: 14px;
}
.toolbar{
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  &>.el-icon{

    margin-right: 8px;
  }
}
.el-aside{
  .el-menu{
    border-right: none;
  }
}
.el-header{
  box-shadow: var(--shadow-bottom);
}
.el-main{
  padding:12px;
}
</style>
