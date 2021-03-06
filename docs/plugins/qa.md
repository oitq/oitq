# 问答管理
## 提供的服务
QA

可通过ctx.qa.addQuestion添加问答
## 提供的指令
| 指令名 | 触发事件|依赖服务|描述|
|---|---|---|---|
|qa|message|[database](/plugins/database)|增删改查问答|
:::tip
别名：#
:::
### 问答指令样例：
#### 增加问答-基本
qa 允许你通过 qa [question:string] [answer:string]的格式添加问答

`qa 你好呀 都好都好`

此时，在用户输入`你好呀`时将会回答`都好都好`
#### 增加问答-设置触发概率权重(默认：1)
在添加问答的同时，你可以设定该问答的触发概率权重

`qa -p 2 你好呀 我不太好`

此时，在用户输入`你好呀`时将有1/(1+2)的概率回答`都好都好`，有2/(1+2)的概率回答`我不太好`
#### 增加问答-设置触发场景(默认：所有环境，可选：group,private,group:[群号]，private:[好友qq])
在添加问答的同时，你可以指定该问答的触发环境

`qa -t group 你该在哪儿触发 我只在群聊触发`

此时，只有在群聊中输入`你该在哪儿触发`，才会回答`我只在群聊触发` 

#### 增加问答-重定向问答
在添加问答的同时，你通过`=>`指定触发该问题时跳转到已有的哪一条回答

`qa hello => 你好呀`

此时，当用户输入`hello`时，将等同于输入了`你好呀`

#### 增加问答-正则匹配
在添加问答的同时，你可以使用`-x`表示该问题为一个正则表达式，且你可在回答里面使用正则匹配出来的值

`qa -x /^你是(\S+)$ 你才是$1`

此时，当用户输入`你是傻X`时，将会回答`你才是傻叉`

#### 增加问答-插值调用
在添加问答的同时，你可以在回答里面使用`$(command)`的形式调用已存在的指令，指令返回值将会替换对应位置的文本

`qa 几点了 现在的时间是：$(time)`

此时，当用户输入`几点了`时，将会回答`现在的时间是:2022-05-19 12:00:00`（返回当前时间，此处仅做功能展示，并非实际数据）
#### 编辑问答
添加`-e`选项表示将指定问题的问答更改为当前回答

`qa -e 几点了 现在的时间是：$(time -f hh:mm:ss)`

此时，当用户输入`几点了`时，将会回答`现在的时间是:12:00:00`（返回当前时间，此处仅做功能展示，并非实际数据）
#### 问答列表
添加`-l`选项表示查看当前系统收录的问答列表，已做分页，你可额外添加选项`/ number`插件指定页的问答，默认第一页
例：

`qa -l`查看第一页
`qa -l / 2`查看第二页
#### 搜索问答
添加`-s <keyword>`可搜索指定关键词相关的问答
例：

`qa -s 你好`查看关于`你好`的问答
#### 查看问答详情
添加`-d`选项表示查看指定id的问答详情，需要你使用`-i`指定id或者直接使用快捷方式`#<id> -d`查看指定问答

`qa -d -i 123`普通模式

`#123 -d`快捷方式模式
(id请查看问答列表的返回值)
#### 删除问答
添加`-r`选项表示删除指定id的问答，需要你使用`-i`指定id或者直接使用快捷方式`#<id> -r`删除指定问答

`qa -r -i 123`普通模式

`#123 -r`快捷方式模式
(id请查看问答列表的返回值)
## 配置
无
