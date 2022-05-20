<template>
  <div class="p-bots">
    <el-form :model="searchCondition">
      <el-form-item>
        <el-button type="success">新增</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="bots">
      <el-table-column type="index" label="序号" :width="60"/>
      <el-table-column prop="uin" label="账号" :min-width="120"/>
      <el-table-column prop="type" label="登录方式" :min-width="120"/>
      <el-table-column prop="status" label="登录状态" :min-width="120"/>
      <el-table-column label="操作" fixed="right" :width="240">
        <template #default="{bot,$index}">
          <el-tooltip placement="top" content="上线">
            <el-button type="success" icon="top" circle/>
          </el-tooltip>
          <el-tooltip placement="top" content="下线">
            <el-button type="danger" icon="bottom" circle/>
          </el-tooltip>
          <el-tooltip placement="top" content="编辑配置">
            <el-button type="success" icon="edit" circle/>
          </el-tooltip>
          <el-tooltip placement="top" content="消息处理">
            <el-button type="primary" icon="message" circle/>
          </el-tooltip>
          <el-tooltip placement="top" content="事件处理">
            <el-button type="primary" icon="finished" circle/>
          </el-tooltip>
          <el-tooltip placement="top" content="删除">
            <el-button type="danger" icon="delete" circle/>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import {store} from '../'
export default {
  name: "bots",
  data(){
    return{
      searchCondition:{},
      bots:[{}],
    }
  },
  methods:{

  },
  mounted() {
    console.log(store)
  }
}
</script>

<style scoped>

</style>
