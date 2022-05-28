<template>
  <div class="p-bots">
    <el-affix>
      <el-button type="success">新增</el-button>
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
                <el-button type="success" v-if="bot.status===0" @click="login(bot.config)">上线</el-button>
                <el-button type="danger" @click="remove(bot.config)">移除</el-button>
              </div>
            </el-affix>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
    <el-empty v-else description="你还未添加机器人">
      <el-button>添加</el-button>
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
  </div>
</template>

<script>
import {store} from "@oitq/client";

const baseConfigInfo = {
  key: '',
  type: 'text',
  value: '',
  current: -1,
  isSave: false
}
const baseOneBot={
  use_cqhttp_notice: true,
  use_http: true,
  use_ws: true,
  access_token: "",
  secret: "",
  post_timeout: 30,
  post_message_format: "array",
  enable_cors: true,
  event_filter: "",
  enable_heartbeat: true,
  heartbeat_interval: 15000,
  rate_limit_interval: 500,
  post_url: [],
  ws_reverse_url: [],
  ws_reverse_reconnect_interval: 3000,
}
export default {
  name: "index",
  data() {
    return {
      currentUin: '',
      visibleDrawer: false,
      configInfo: {
        ...baseConfigInfo
      },
      newAdmin: '',
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
      admins.push(this.newAdmin)
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

    },
    login(config){

    },
    add(config){

    },
    remove(config){

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
}
</style>
