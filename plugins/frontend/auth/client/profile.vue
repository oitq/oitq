<template>
  <div class="c-profile">
    <el-form-item label="登录名">{{ user.user_id }}</el-form-item>
    <el-form-item label="用户名">{{ user.name }}</el-form-item>
    <el-form-item label="等级">{{ user.authority }}</el-form-item>
    <el-form-item>
      <el-button @click="showDialog=true" type="success">修改密码</el-button>
      <el-button @click="logout">退出登录</el-button>
    </el-form-item>
    <el-dialog append-to-body v-model="showDialog" title="修改密码">
      <el-form :model="formData" label-width="80px" ref="passwordForm" :rules="rules">
        <el-form-item label="新密码" prop="password">
          <el-input type="password" v-model="formData.password" placeholder="请输入新密码"/>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input type="password" v-model="formData.confirm" placeholder="请再次输入密码"/>
        </el-form-item>
        <el-form-item>
          <el-button @click="update">确认修改</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import {store, send} from '@oitq/client'
import {config,sha256} from "./utils";

export default {
  name: "profile",
  data() {
    return {
      showDialog: false,
      formData: {
        password: '',
        confirm: ''
      },
      rules:{
        password:[
          {
            required:true,
            message: '请输入密码'
          },
          {
            type:'string',
            message:'密码最短为6位',
            min:6
          }
        ],
        confirm:[
          {
            required:true,
            message: '请再次输入密码'
          },
          {
            type:'string',
            message:'密码最短为6位',
            min:6
          },
          {
            message:'两次输入的密码不一致',
            validator:(rule,value)=>{
              return value===this.formData.password
            }
          }
        ]
      }
    }
  },
  computed: {
    user() {
      return store.user || {}
    }
  },
  methods: {
    logout() {
      delete config.id
      delete config.token
      delete config.expire
      send('user/logout')
    },
    update() {
      this.$refs.passwordForm.validate(async success=>{
        if(success){
          await send('user/update', {user_id:this.user.user_id,password: await sha256(this.formData.password)})
          this.$message.success('修改成功')
          this.showDialog=false
        }
      })
    }
  }
}
</script>

<style scoped>

</style>
