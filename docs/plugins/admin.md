# 管理Bot
## 提供的服务
无
## 提供的指令
| 指令名 | 触发事件|依赖服务|描述|
|---|---|---|---|
|auth|message|[database](/plugins/database)|为比你权限等级低的用户授权|
|ignore|message|[database](/plugins/database)|让机器人忽略指定用户的消息|
|plugin|message|无|启用、禁用、安装、卸载插件，显示插件列表|
## 子插件提供的指令
| 指令名 | 触发事件|依赖服务|描述|
|---|---|---|---|
|oitq|message|无|增、删、改、查[oitq配置](/config/app)|
|kick|message.group|无|将指定群成员踢出当前群|
|invite|message.group|无|邀请好友加入当前群(该好友需机器人已添加)|
|mute|message.group|无|禁言指定群成员|
|setAdmin|message.group|无|将指定群成员设为(取消)管理员(需机器人为群主)|
|setCard|message.group|无|设置指定群成员名片|
|setTitle|message.group|无|设置指定群成员头衔|
|quit|message.group|无|退出当前群|
## 配置
无
