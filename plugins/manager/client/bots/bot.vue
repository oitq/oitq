<template>
  <div class="c-bot">
    <el-form :model="innerValue" style="margin: 0 28px">
      <el-form-item prop="uin" label="账号">
        <el-input type="number" v-model="innerValue.uin"/>
      </el-form-item>
      <el-form-item prop="config" label="配置文件">
        <el-form :model="innerValue" label-width="80px" class="sub-form">
          <el-form-item prop="master" label="主人账号">
            <el-input v-model="innerValue.master"></el-input>
          </el-form-item>
          <el-form-item prop="admins" label="管理员" class="admins-wrap">
            <el-tag v-for="(admin,idx) in innerValue.admins" :key="admin" type="success" closable
                    @close="removeAdmin(idx,innerValue.admins)">
              {{ admin }}
            </el-tag>
            <el-input v-model="newAdmin">
              <template #suffix>
                <el-icon class="el-input__icon" @click="addAdmin(innerValue.admins)">
                  <plus/>
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="config" label="oicq配置">
            <el-form :model="innerValue.config" class="sub-form">
              <el-form-item v-for="([key,value],idx) in Object.entries(innerValue.config)"
                            :key="key+idx"
                            :prop="key" :label="key"
              >
                <el-input v-if="typeof value==='string'" v-model="innerValue.config[key]"/>
                <el-checkbox v-else-if="typeof value==='boolean'" v-model="innerValue.config[key]"/>
                <el-input-number v-else-if="typeof value==='number'" v-model="innerValue.config[key]"/>
                <el-select allow-create filterable v-else-if="Array.isArray(value)" multiple v-model="innerValue.config[key]"/>
                <el-button type="danger" size="small" style="display:inline-block;margin-left: 8px" icon="close" circle
                           @click="delete innerValue.config[key]"/>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="createOicqConfig">新增一行配置</el-button>
              </el-form-item>
            </el-form>
          </el-form-item>
          <el-form-item property="oneBot" label="启用OneBot" v-if="typeof innerValue.oneBot==='boolean'">
            <el-checkbox v-model="innerValue.oneBot"></el-checkbox>
            <el-button type="success" style="margin-left: 8px" @click="setOneBotConfig(innerValue,baseOneBot)">自定义</el-button>
          </el-form-item>
          <el-form-item property="oneBot" label="配置OneBot" v-if="typeof innerValue.oneBot==='object'">
            <el-form :model="innerValue.oneBot" class="sub-form">
              <el-form-item v-for="([key,value],idx) in Object.entries(innerValue.oneBot)" :key="key+idx" :prop="key" :label="key">
                <el-input v-if="typeof value==='string'" v-model="innerValue.oneBot[key]"/>
                <el-checkbox v-else-if="typeof value==='boolean'" v-model="innerValue.oneBot[key]"/>
                <el-input-number v-else-if="typeof value==='number'" v-model="innerValue.oneBot[key]"/>
                <el-select allow-create filterable v-else-if="Array.isArray(value)" multiple v-model="innerValue.oneBot[key]"/>
              </el-form-item>
            </el-form>
            <el-button type="success" style="margin-left: 8px" @click="setOneBotConfig(innerValue,true)">使用默认配置</el-button>
            <el-button type="danger" style="margin-left: 8px" @click="setOneBotConfig(innerValue,false)">禁用</el-button>
          </el-form-item>
        </el-form>
      </el-form-item>
      <el-form-item>
        <el-affix position="bottom" target=".p-bots" :offset="20">
          <div class="form-footer">
            <slot name="footer" :bot="innerValue">
            </slot>
          </div>
        </el-affix>
      </el-form-item>
    </el-form>
    <el-drawer
        v-model="visibleDrawer"
        title="请配置你要添加的配置字段信息"
        direction="rtl"
        :before-close="handleClose"
    >
      <el-form :model="configInfo">
        <el-form-item label="key" prop="key">
          <el-input v-model="configInfo.key"></el-input>
        </el-form-item>
        <el-form-item label="数据类型" prop="type">
          <el-radio-group v-model="configInfo.type" @change="changeValueType($event,configInfo)">
            <el-radio label="text">字符串</el-radio>
            <el-radio label="number">数值</el-radio>
            <el-radio label="boolean">布尔值</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="value" prop="value">
          <el-input v-if="configInfo.type==='text'" v-model="configInfo.value"/>
          <el-input-number v-if="configInfo.type==='number'" v-model="configInfo.value"/>
          <el-checkbox v-if="configInfo.type==='boolean'" v-model="configInfo.value"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="saveOicqConfig">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script>
import {baseOneBot} from "./static";
import {deepClone} from "../utils";

const baseConfigInfo = {
  key: '',
  type: 'text',
  value: '',
  isSave: false
}
export default {
  name: "bot",
  props:{
    modelValue:{
      type:Object,
    },
    type:{
      type:String,
      validator(value){
        return ['add','edit','detail'].includes(value)
      }
    }
  },
  watch:{
    modelValue:{
      deep:true,
      handler(value){
        this.innerValue=deepClone(value)
      }
    },
    innerValue:{
      deep:true,
      handler(value){
        this.$emit('input',value)
        this.$emit('change',value)
        this.$emit('update:modelValue',value)
      }
    }
  },
  data(){
    return {
      innerValue:deepClone(this.modelValue),
      newAdmin:'',
      visibleDrawer:false,
      configInfo:{...baseConfigInfo},
      baseOneBot
    }
  },
  methods:{

    addAdmin(admins) {
      if (!Boolean(this.newAdmin)) return this.$message.error('请输入管理有账号')
      if (!/[1-9][0-9]{5,11}/.test(this.newAdmin)) return this.$message.error('管理员账号输入错误')
      admins.push(Number(this.newAdmin))
      this.newAdmin=''
    },
    handleClose(done) {
      if (!this.configInfo.isSave) {
        this.$messageBox.confirm('关闭后数据将会被清空，确认关闭么？')
            .then(() => {
              this.configInfo = {
                ...baseConfigInfo
              }
              done()
            }).catch(() => {
        })
      } else {
        done()
      }

    },
    setOneBotConfig(bot,value){
      bot.oneBot=typeof value==='boolean'?value:{...value}
    },
    createOicqConfig() {
      this.visibleDrawer = true
    },
    saveOicqConfig() {
      this.innerValue.config[this.configInfo.key]=this.configInfo.value
      this.visibleDrawer=false
      this.configInfo.isSave = true
      this.configInfo={...baseConfigInfo}
    },
    changeValueType(type, target) {
      switch (type) {
        case "text":
          target.value = ''
          break;
        case 'boolean':
          target.value = false
          break;
        case 'number':
          target.value = 0
          break;
      }
    },
    removeAdmin(index, admins) {
      admins.splice(index, 1)
    }
  }
}
</script>

<style scoped>

</style>
