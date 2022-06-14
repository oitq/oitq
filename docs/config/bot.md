## 配置解释
bot配置为一个对象，包含以下属性：
| 属性 | 类型 | 必填 | 描述 |
| ---- | ---- | ---- |----|
| uin | `number` | 是 | 登录账号 |
| password | `string` | 否 | 登录密码，不填则扫码登录(扫码登录需配合[@oitq/plugin-console](/plugins/console)才能使用，且具有一定局限性) |
| config | [Config](https://oicqjs.github.io/oicq/interfaces/Config.html) | 否 | oicq Client配置 |
| master | `number` | 否 | bot所有者账号 |
| admins | `number`[] | 否 | bot管理员账号 |
## 默认配置
```json
{
  "admins":[],
  "config":{
    "data_dir":"./data"
  },
  "master":1659488338
}
```
