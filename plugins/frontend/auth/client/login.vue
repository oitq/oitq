<template>
  <el-card class="login">
    <template v-if="user && user.token">
      <h1><span>验证码登录</span></h1>
      <p class="hint">欢迎你，{{ user.name || 'OITQ 用户' }}！</p>
      <p class="hint">请用上述账号将下面的验证码私聊发送给任意机器人</p>
      <p class="token">{{ user.token }}</p>
      <div class="control">
        <el-button @click="user.token = null">返回上一步</el-button>
      </div>
    </template>
    <el-tabs v-else v-model="config.authType">
      <el-tab-pane label="验证码登录" :name="'captcha'">
        <el-form-item label="账号" label-width="60">
          <el-input placeholder="账号" v-model="config.userId" @keypress.enter.stop="loginWithCaptcha" #prefix>
            <el-icon>
              <component is="user"></component>
            </el-icon>
          </el-input>
          <p class="error" v-if="message">{{ message }}</p>
        </el-form-item>
        <div class="control">
          <el-button @click="$router.back()">返回</el-button>
          <el-button type="primary" @click="loginWithCaptcha">获取验证码</el-button>
        </div>
      </el-tab-pane>
      <el-tab-pane label="用户名密码登录" name="password" label-width="60">
        <el-form-item label="用户名">
          <el-input placeholder="用户名" v-model="config.name" #prefix>
            <el-icon>
              <component is="user"></component>
            </el-icon>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" label-width="60">
          <el-input type="password" placeholder="密码" v-model="config.password" @keypress.enter.stop="loginWithPassword"
                    :type="config.showPass ? 'text' : 'password'">
            <template #prefix>
              <el-icon>
                <component is="lock"></component>
              </el-icon>
            </template>
            <template #suffix>
              <el-icon @click="config.showPass = !config.showPass">
                <component :is="config.showPass ? 'lock' : 'unlock'"></component>
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <p class="error" v-if="message">{{ message }}</p>
        <div class="control">
          <el-button @click="$router.back()">返回</el-button>
          <el-button @click="loginWithPassword">登录</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {ElMessage} from "element-plus";
import {config, sha256} from './utils'
import {send} from '@oitq/client'
import {UserLogin} from '@oitq/plugin-auth'

if (isSecureContext) config.authType = 'captcha'
const message = ref<string>()
const user = ref<UserLogin>()
let timestamp = 0

async function loginWithCaptcha() {
  const now = Date.now()
  if (now < timestamp) return
  const {userId} = config
  if (!userId) return
  timestamp = now + 1000
  try {
    user.value = await send('login/captcha', Number(userId))
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function loginWithPassword() {
  const {name, password} = config
  try {
    await send('login/password', name, await sha256(password))
  } catch (e) {
    ElMessage.error(e)
  }
}
</script>

<style lang="scss">
.route-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

section.login {
  width: 600px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0;

  .el-card-body {
    padding: 3rem 0 !important;
  }

  h1 {
    font-size: 1.5rem;
    margin: 2.5rem auto;
    cursor: default;
  }

  .token {
    font-weight: bold;
  }

  .el-input {
    display: block;
    max-width: 400px;
    margin: 1rem auto;
  }

  .control {
    margin: 2.5rem auto;
  }

  .el-button {
    width: 8rem;
    margin: 0 1rem;
  }
}
</style>
