# oitq
 一个优雅的机器人开发框架
# [template](https://github.com/oitq/app/tree/v3)
# 快速上手
- 创建/初始化项目
```shell
mkdir oitq-app && cd oitq-app
npm init -y
```
- 安装`oitq`
```shell
npm install oitq
```
- 准备工作
1. 创建配置文件oitq.yaml
```yaml
logLevel: info # 日志等级
plugin_dir: plugins # 你存放插件的目录地址
adapters: # 适配器配置
  oicq: # 该适配器框架已集成，可直接使用
    bots:
      -
        uin: 147258369 # 你的机器人账号
        master: 1659488338 # 机器人主人账号
        password: 123456789 # 你的机器人密码
        protocol: # 传给createClient的config配置
          platform: 5
services: # 服务配置
  http: # 该服务框架已集成，可直接使用
    port: 8086 # http监听的端口
plugins:
  terminalLogin: # 命令行登录插件，启用后可从命令行登录机器人 (该服务框架已集成，可直接使用)
  help: # 帮助插件，启用后可使用帮助指令 (该服务框架已集成，可直接使用)
  daemon: # 插件服务监听进程，在服务挂掉时自动重启 (该服务框架已集成，可直接使用)
    autoRestart: true # 是否开启自动重启
  watcher: # 插件改动监听插件，变更插件后会自动重启相应插件 (该服务框架已集成，可直接使用)
    root: . # 监听的根目录路径
```
2. 创建入口文件 index.js，并输入一下内容
```javascript
const {start} = require('oitq')
start('oitq.yaml') // 在配置文件名为oitq.yaml oitq.config.yaml时，参数可缺省
```
3. 启动
```shell
node ./index.js
```
- 你也可以手动在package.json里面配置启动脚本
## 关于适配器
- oitq默认内置了oicq的适配器，你可以直接通过在配置文件中添加相关配置即可调用该适配器，具体配置可参考上文
- 若你有其他平台的需求，可自行开发适配器，也可提issue，我会不定期查看需求
## 编写插件
1. 使用oitq编写插件，一般情况下，你无需关注插件如何加载/卸载】，程序会根据你的配置文件自动尝试加载相应名称的插件
2. 若你同时启用了daemon插件和watcher插件，并正确配置了插件所在目录，oitq会在你编写插件时，自动加载你变更后的新插件，配置文件变更时，根据你的更改自动判断是重启项目还是重启指定插件插件
## HelloWorld
- 现在，让我们来编写一个最简单的Hello World插件，来熟悉插件的编写方式
- 此处我们使用项目下的plugins作为我们的插件目录，此处的插件目录需与配置文件里的plugin_dir一致，插件才能正常加载
- 为方便理解，我们使用js来开发插件，当然，如果你更喜欢ts，也可以使用ts开发，oitq内置了对ts的支持，你无需任何配置
### 1. 在插件目录下新建hello.js，并编写如下代码
plugins/hello.js
```javascript
import {Plugin} from 'oitq'
const helloWorldPlugin = new Plugin('helloWorld',__filename)//此处我们定义了一个名为helloWorld的插件，并声明了其所在的文件路径为__filename
helloWorldPlugin.command('hello','all') //定义了一个hello指令，并声明其触发环境为all(即所有收到的消息)
    .desc('我说 hello 你回复 world') // 为该指令添加描述说明
    .action(()=>'world') // 在指令触发时返回的文本内容
```

### 2. 加载插件

- 新建的插件默认不会被加载，我们需要在配置文件里添加相应插件配置后才能架子啊
- 由于该插件没有配置，我们将该插件的配置留空即可

oitq.yaml
```yaml
# ...
plugins:
# ...
  helloWorld:
# ...
```
- 若你启用了watcher并正确配置了插件目录信息，此时你会在控制台看到，oitq已经自动加载了该插件
- 若未启用watcher，则需要你手动重启项目，oitq才会加载该插件，我们推荐在开发模式下启用watcher插件，在生产环境不启用watcher插件
### 编写更为复杂的插件
通过上边的helloWorld插件，相信你已经对oitq的插件有了一定的了解，但是上文提到的配置文件有什么用，怎么用，你应该还是一头雾水。现在，我们来额外增加一些功能，让你深入了解一下Plugin的更多功能

plugins/hello.js
```javascript
import {Plugin} from 'oitq'
const helloWorldPlugin = new Plugin('helloWorld',__filename)//此处我们定义了一个名为helloWorld的插件，并声明了其所在的文件路径为__filename
const config=helloWorldPlugin.config // 在你可以通过实例化Plugin的对象获取到该插件的配置
helloWorldPlugin.on('oicq.message',(session)=>{ // 监听oicq的message事件，oicq适配器对oicq的数据做了封装，将所有事件的参数封装为统一的session
    if(session.raw_message==='你好') session.reply('世界')
})
helloWorldPlugin.command('hello','all') //定义了一个hello指令，并声明其触发环境为all(即所有收到的消息)
    .desc('我说 hello 你回复 world') // 为该指令添加描述说明
    .action(()=>'world') // 在指令触发时返回的文本内容
const dispose= helloWorldPlugin.on('oicq.system.login.qrcode',(session)=>{ // oitq对底层事件传输做了封装，on方法会返回一个取消当前监听的回调函数
    console.log(session.image)
    if(true){ //你可以根据自己需求，调用dispose取消当前监听
        dispose()
    }
})

```