<template>
  <el-menu-item v-if="!menu.children.length" :index="target">
    <el-icon v-if="menu.meta.icon"><component :is="menu.meta.icon"/></el-icon>
    <template #title>
      <span>{{ menu.name }}</span>
    </template>
  </el-menu-item>
  <el-sub-menu v-else :index="target">
    <el-icon v-if="menu.meta.icon"><component :is="menu.meta.icon"/></el-icon>
    <template #title>
      <span>{{ menu.name }}</span>
    </template>
  </el-sub-menu>
  <aside-sub-menu v-for="item in menu.children" :menu="item" :key="item.path"></aside-sub-menu>
</template>

<script lang="ts">
import { store } from '@oitq/client'
import { routeCache } from './utils'
export default {
  name:'AsideSubMenu',
  data(){
    return {

    }
  },
  props:{
    menu:{
      type:Object,
      default(){
        return {
          children:[]
        }
      }
    }
  },
  computed:{
    target(){
      return routeCache[this.menu.name]|| this.menu.path.replace(/:.+/, '')
    },
    badge(){
      if (!this.loaded.value) return 0
    },
    loaded(){
      if (!this.menu.meta.fields) return true
      return this.menu.meta.fields.every((key) => store[key])
    }
  }
}
</script>

<style lang="scss">
aside.layout-aside {
  z-index: 100;
  background-color: var(--card-bg);
  box-shadow: var(--shadow-right);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: background-color 0.3s ease;
  h1 {
    font-size: 1.5rem;
    text-align: center;
    margin: 1rem 0;
  }
  .k-menu-item {
    font-size: 1.05rem;
    padding: 0 2rem;
    line-height: 3rem;
  }
  $marker-width: 4px;
  .k-menu-item.active::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: $marker-width;
    height: 2rem;
    transform: translateY(-50%);
    display: block;
    border-radius: 0 $marker-width $marker-width 0;
    background-color: var(--active);
    transition: background-color 0.3s ease;
  }
  .k-menu-item .k-icon {
    width: 1.5rem;
    height: 1.25rem;
    margin-right: 0.75rem;
    text-align: center;
    vertical-align: -4px;
  }
  .k-menu-item .badge {
    position: absolute;
    border-radius: 1rem;
    color: #ffffff;
    background-color: var(--error);
    top: 50%;
    right: 1.5rem;
    transform: translateY(-50%);
    line-height: 1;
    padding: 4px 8px;
    font-size: 0.75rem;
    font-weight: bolder;
    transition: 0.3s ease;
  }
  .top {
    margin-top: 0.5rem;
  }
  .bottom {
    margin-bottom: 1rem;
  }
}
</style>
