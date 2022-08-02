# oitq
 一个优雅的机器人开发框架
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
  print: 
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
