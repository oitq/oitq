:::tip
继承自 [Client](https://oicqjs.github.io/oicq/classes/Client.html)
:::
## propertys
| 属性 | 类型 | 描述 |
| ---- | ---- | ---- |
| admins | `number`[] | bot管理员账号 |
| master | `number` | bot所有者账号 |
| options | `object` | Bot配置 |
## methods
| 方法 | 参数 | 返回值 | 描述 |
| ---- | ---- | ---- | ---- |
| isAdmin | user_id:`number` | `boolean` | 是否为管理员 |
| isMaster | user_id:`number` | `boolean` | 是否为所有者 |
| sendMsg | channelId:`ChannelId`,msg:[`Sendable`](https://oicqjs.github.io/oicq/modules.html#Sendable) | [MessageRet](https://oicqjs.github.io/oicq/interfaces/MessageRet.html) | 发送消息 |
| broadcast | channelIds:`ChannelId[]`,msg:[`Sendable`](https://oicqjs.github.io/oicq/modules.html#Sendable) | [MessageRet[]](https://oicqjs.github.io/oicq/interfaces/MessageRet.html) | 广播消息 |
