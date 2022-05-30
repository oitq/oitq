<template>
  <div class="p-bots">
    <el-affix>
      <el-button type="success" @click="showAdd=true">添加</el-button>
    </el-affix>
    <el-tabs v-model="currentUin" tab-position="left" v-if="hasBot">
      <el-tab-pane v-for="(bot,index) in bots" :name="bot.uin" :key="bot.uin" :label="String(bot.uin)">
        <el-form :model="bot" style="margin: 0 28px">
          <el-form-item prop="uin" label="账号">
            <span>{{ bot.uin }}</span>
          </el-form-item>
          <el-form-item prop="nickname" label="昵称">
            <span>{{ bot.nickname }}</span>
          </el-form-item>
          <el-form-item prop="status" label="在线状态">
            <el-radio-group :model-value="bot.status">
              <el-radio :label="11">在线</el-radio>
              <el-radio :label="31">离开</el-radio>
              <el-radio :label="41">隐身</el-radio>
              <el-radio :label="50">忙碌</el-radio>
              <el-radio :label="60">Q我吧</el-radio>
              <el-radio :label="70">勿扰</el-radio>
              <el-radio :label="0">离线</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item prop="config" label="配置文件">
            <el-form :model="bot.config" label-width="80px" class="sub-form">
              <el-form-item prop="master" label="主人账号">
                <el-input v-model="bot.config.master"></el-input>
              </el-form-item>
              <el-form-item prop="admins" label="管理员" class="admins-wrap">
                <el-tag v-for="(admin,idx) in bot.config.admins" :key="admin" type="success" closable
                        @close="removeAdmin(idx,bot.config.admins)">
                  {{ admin }}
                </el-tag>
                <el-input v-model="newAdmin">
                  <template #suffix>
                    <el-icon class="el-input__icon" @click="addAdmin(bot.config.admins)">
                      <plus/>
                    </el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item prop="config" label="oicq配置">
                <el-form :model="bot.config.config" class="sub-form">
                  <el-form-item v-for="([key,value],idx) in Object.entries(bot.config.config)"
                                :key="key+idx"
                                :prop="key" :label="key"
                  >
                    <el-input v-if="typeof value==='string'" v-model="bot.config.config[key]"/>
                    <el-checkbox v-else-if="typeof value==='boolean'" v-model="bot.config.config[key]"/>
                    <el-input-number v-else-if="typeof value==='number'" v-model="bot.config.config[key]"/>
                    <el-input type="textarea" v-else-if="typeof value==='object'" v-model="bot.config.config[key]"/>
                    <el-button type="danger" size="small" style="display:inline-block;margin-left: 8px" icon="close" circle
                               @click="delete bot.config.config[key]"/>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="createOicqConfig(index)">新增一行配置</el-button>
                  </el-form-item>
                </el-form>
              </el-form-item>
              <el-form-item property="oneBot" label="启用OneBot" v-if="typeof bot.config.oneBot==='boolean'">
                <el-checkbox v-model="bot.config.oneBot"></el-checkbox>
                <el-button type="success" style="margin-left: 8px" @click="setOneBotConfig(bot,baseOneBot)">自定义</el-button>
              </el-form-item>
              <el-form-item property="oneBot" label="配置OneBot" v-if="typeof bot.config.oneBot==='object'">
                <el-form :model="bot.config.oneBot" class="sub-form">
                  <el-form-item v-for="([key,value],idx) in Object.entries(bot.config.oneBot)" :key="key+idx" :prop="key" :label="key">
                    <el-input v-if="typeof value==='string'" v-model="bot.config.oneBot[key]"/>
                    <el-checkbox v-else-if="typeof value==='boolean'" v-model="bot.config.oneBot[key]"/>
                    <el-input-number v-else-if="typeof value==='number'" v-model="bot.config.oneBot[key]"/>
                    <el-select allow-create filterable v-else-if="Array.isArray(value)" multiple v-model="bot.config.oneBot[key]"/>
                  </el-form-item>
                </el-form>
                <el-button type="success" style="margin-left: 8px" @click="setOneBotConfig(bot,true)">使用默认配置</el-button>
                <el-button type="danger" style="margin-left: 8px" @click="setOneBotConfig(bot,false)">禁用</el-button>
              </el-form-item>
            </el-form>
          </el-form-item>
          <el-form-item>
            <el-affix position="bottom" target=".p-bots" :offset="20">
              <div class="form-footer">
                <el-button type="primary" @click="saveConfig(bot.config)">保存</el-button>
                <el-button type="success" @click="login({},bot.uin,'password')">上线</el-button>
                <el-button type="danger" @click="remove(bot.uin)">移除</el-button>
              </div>
            </el-affix>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
    <el-empty v-else description="你还未添加机器人，请点击左上角添加按钮进行添加">
    </el-empty>
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
    <el-dialog width="70%" title="bot配置" v-model="showAdd" style="height: 500px;overflow: auto">
      <bot v-model="newBot" type="add"></bot>
      <template #footer scope="{bot}">
        <el-button type="primary" @click="addBot(bot)">新增</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import {store,send} from "@oitq/client";
import {baseOneBot, defaultBotConfig} from "./static";
import Bot from './bot.vue'
import {deepClone} from "../utils";
const baseConfigInfo = {
  key: '',
  type: 'text',
  value: '',
  current: -1,
  isSave: false
}
export default {
  name: "Bots",
  components:{Bot},
  data() {
    return {
      currentUin: '',
      visibleDrawer: false,
      showAdd:false,
      configInfo: {
        ...baseConfigInfo
      },
      newAdmin: '',
      newBot:deepClone(defaultBotConfig),
      baseOneBot
    }
  },
  computed: {
    bots() {
      return [...Object.values(store.bots)]
    },
    hasBot() {
      return !!this.bots.length
    }
  },
  methods: {
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
      bot.config.oneBot=typeof value==='boolean'?value:{...value}
    },
    createOicqConfig(index) {
      this.configInfo.current = index
      this.visibleDrawer = true
    },
    saveOicqConfig() {
      this.bots[this.configInfo.current].config.config[this.configInfo.key]=this.configInfo.value
      this.configInfo.isSave = true
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
    saveConfig(config){
      send('manager/bot-update',config)
    },
    async login(context,uin,type,value){
      if(type==='password' && !value){
        const {value:password}=await this.$messageBox.prompt('请输入密码(留空则扫码登录)',{inputType:'password'})
        context=await send('manager/bot-login',uin,type,password)
      }else if(type==='qrcode'){
        context=await send('manager/bot-login',uin,'password')
      }else{
        context=await send('manager/bot-login',uin,type,value)
      }
      if(!context.success){
        switch (context.reason){
          case 'device':{
            const {value:sms}=await this.$messageBox.prompt(context.message,'设备锁验证')
            return this.login(context,uin,'sms',sms)
          }
          case 'slider':{
            const {value:ticket}=await this.$messageBox.prompt(context.data,context.message)
            return this.login(context,uin,'slider',ticket)
          }
          case 'qrcode':{
            await this.$messageBox.confirm(`<img src="${context.data}"/>`,'请扫码后继续',
                {
                  dangerouslyUseHTMLString: true,
                  center:true
                })
            return this.login({},uin,'qrcode')
          }
          default: {
            this.$message.error(context.reason)
          }
        }
      }else{
        this.$message.success(context.message)
      }
    },
    addBot(bot){
      send('manager/bot-add',{...bot,uin:Number(bot.uin)})
      this.showAdd=false
    },
    remove(uin){
      send('manager/bot-remove',uin)
    },
    removeAdmin(index, admins) {
      admins.splice(index, 1)
    }
  }
}
</script>

<style lang="scss">
.p-bots {
  height: 100%;
  .el-tabs{
    height: calc(100% - 24px);
    .el-tabs__content{
      max-height: 100%;
      overflow: auto;
    }
  }
  .sub-form {
    & > .el-form-item {
      margin-bottom: 8px;

      &:nth-last-of-type(1) {
        margin-bottom: 0;
      }
      .el-form-item__content{
        &>.el-input {
          width: 200px;
        }
      }
    }


    .admins-wrap {
      .el-form-item__content {
        .el-tag {
          margin: 0 8px;

          &:nth-of-type(1) {
            margin-left: 0;
          }
        }

        .el-input {
          width: 120px;
        }
      }
    }
  }
  .form-footer{
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  .el-dialog__body{
    height: 50vh;
    overflow: auto;
  }
}
</style>
