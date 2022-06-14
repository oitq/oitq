:::tip
继承自 [Plugin](/interface/plugin)
:::
## propertys
| 属性 | 类型 | 描述 |
| ---- | ---- | ---- |
| middlewares | [Middleware](/interface/middleware)[] | 存放App上的所有中间件 |
| bots | [Bot](/interface/bot)[] | 存放App上的所有Bot |
| commandList| [Command](/interface/command)[] | 存放App上的所有指令 |
| _commands | Map<string,[Command](/interface/command)> | 带结构信息的指令Map |
## methods
| 方法 | 参数 | 返回值 | 描述 |
| ---- | ---- | ---- | ---- |
| addBot | config:[`Bot.Config`](/config/bot) | [Bot](/interface/bot) | 添加一个Bot |
| removeBot | uin:`number` | boolean | 移除指定Bot |
| broadcast | msgChannelIds:`MsgChannelId[]`,msg:[`Sendable`](https://oicqjs.github.io/oicq/modules.html#Sendable) | void | 广播消息 |
| start | - | void | 启动App |
