<template>
  <div class="p-bots">
    <el-form :model="searchCondition">
      <el-form-item>
        <el-button type="success">新增</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="bots">
      <el-table-column type="index" label="序号" :width="60"/>
      <el-table-column prop="uin" label="账号" min-width="120"/>
      <el-table-column prop="type" label="登录方式" min-width="120"/>
      <el-table-column prop="status" label="登录状态" min-width="120"/>
      <el-table-column label="操作">
        <template #default="{bot,$index}">
          <el-popover placement="top" title="上线">
            <template #reference>
              <el-button type="success" icon="top" circle/>
            </template>
          </el-popover>
          <el-popover placement="top" title="下线">
            <template #reference>
              <el-button type="danger" icon="bottom" circle/>
            </template>
          </el-popover>
          <el-popover placement="top" title="编辑配置">
            <template #reference>
              <el-button type="primary" icon="edit" circle/>
            </template>
          </el-popover>
          <el-popover placement="top" title="消息处理">
            <template #reference>
              <el-button type="success" icon="message" circle/>
            </template>
          </el-popover>
          <el-popover placement="top" title="完成">
            <template #reference>
              <el-button type="primary" icon="finished" circle/>
            </template>
          </el-popover>
          <el-popover placement="top" title="删除">
            <template #reference>
              <el-button type="danger" icon="delete" circle/>
            </template>
          </el-popover>
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
