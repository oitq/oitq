:::tip
继承自 [EventThrower](/interface/event)
:::
## propertys

| 属性 | 类型 | 描述 |
| :--- | :--- | :--- |
| app | [App](/interface/app)| 插件所属应用 |
| parent | Plugin | 插件所属插件 |
| children | Plugin[] | 当前插件的所有子插件 |
| config | any | 插件配置 |
## methods
| 方法 | 参数 | 返回值 | 描述 |
| :--- | :--- | :--- | :--- |
| getCommand | name:`string` | [Command](/interface/command) | 获取指定指令 |
| command | desc:`string`,triggerEvent:`string` | [Command](/interface/command) | 添加指令 |
| plugin | name:`string` or `function` or `{install:function}`,config:any | Plugin | 添加子插件 |
| middleware | Middleware | this | 添加中间件 |
| execute | session:Session,content:string=session.cqCode | `boolean` or `string` | 执行指令 |
| install | config:any | void | 安装插件 |
| enable | bot:Bot=null | void | 启用插件 |
| disable | bot:Bot=null | void | 禁用插件 |
| dispose | plugin:Plugin=this | void | 销毁插件 |
| restart | - | void | 重启插件 |
| version | version:`string` | this | 设置插件版本 |
| name | name:`string` | this | 设置插件名称 |
| desc | description:`string` | this | 设置插件描述 |
| author | author:`AuthorInfo` | this | 设置插件作者 |
| repo | repo:`RepoInfo` | this | 设置插件仓库 |
| toJSON | - | object | 转换为JSON对象 |
