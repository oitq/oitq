# 快速上手
根据本章节，你可快速创建一个oitq的项目。
更多细节，你可点击对应标题连接了解
::: tip
在此之前，你需要现在自己机器上配置好[NodeJS](https://nodejs.org/)环境，你可通过命令行输入`node -v`和`npm -v`以测试，是否正确安装NodeJS。
:::
## 创建项目
```shell
mkdir oitq-app #创建项目文件夹
cd oitq-app #进入项目文件夹
npm init -y #初始化node项目的package.json
```
## [安装](/start/install)
```shell
npm install oitq
```
## oitq提供两种工作模式可供开发者选择：

### 1. [作为服务提供者工作](/start/server)
在这种模式下，你可以使用任何编程语言编写自己的机器人功能，然后调用Oitq的提供的HttpAPI以实现自己的功能

1.1.安装oitq作为项目依赖
```shell
npm install oitq @oitq/service-http-server @oitq/service-onebot -S
```
1.2.在项目中建立index.js,并撰写以下代码到里面
```javascript
const {createApp}=require('oitq')
const httpServer=require('@oitq/service-http-server')
const oneBot=require('@oitq/service-onebot')
const app = createApp({logLevel: 'info'})
app.plugin(httpServer, {port: 8086})
app.plugin(oneBot)
app.addBot({
    uin: 1234567890,
    password: '*********',
    type: "password",
    config: {platform: 5},
    oneBot: true//可传对象，true为使用默认Onebot配置
})
app.start()
//start中的8080代表oitq服务监听的端口，也可以改成你想监听的端口
```
1.3 （可选）添加启动脚本

往根目录下的package.json里添加启动脚本
```json5
{
  // ...
  scripts: {
    "start": "node ./index.js",
    // ...
  },
  // ...
}
```
1.4 启动
命令行执行`npm start`(若你配置了1.3)或`node ./index.js`

至此，oitq作为服务提供者已完成，你可访问[以服务提供者工作](/start/server))查看其提供的服务

### 2.[作为Bot开发框架](/start/framework)
在这种模式下，即代表你需要在本框架下实现自己的Bot所需功能代码，而不依赖其他框架。
在此模式下，你至少需要掌握`javascript`或`typescript`语言的代码撰写能力以及`nodeJs`基础。
若你不具备以上条件，请先自行学习后继续往下看

2.1 安装你需要使用的[插件](/plugins/),此处以[问答](/plugins/qa)为例
```shell
npm install @oitq/plugin-qa @oitq/cli -S #@oitq/cli 为oitq脚手架，可用于添加、移除bot，启动项目
```
2.2 在项目根目录创建配置文件`oitq.config.json`并添加以下内容

```json5
{
  "bots": [
    {
      "uin": 123456789,//改成你自己的
      "password": "*********",//改成你自己的
      "config": {//传递给oicq实例化Client时的第二个参数
        "platform": 5
      }
    }
  ],
  "plugins": { //启用插件的配置
    "qa": true // 为true表示启用了@oitq/plugin-qa插件
  },
  "plugin_dir": "./plugins",//此处为你自己存放插件的目录，暂时用不到
  "logLevel": "info"
}
```
2.3在`package.json`中添加启动脚本
```json5
{
  // ...
  scripts: {
    "start": "oitq start .",//使用cli启动项目，自动读取当前目录下的配置文件，
    "dev": "oitq start . --log-level debug --watch .",//使用cli启动项目，自动读取当前目录下的配置文件，
    // ...
  },
  // ...
}
```
2.4 运行启动项目
```shell
npm start
```

到这里，`以服务提供者工作`模式以完成，以下章节均为`以插件开发工作`的文档

若官方插件不足以满足你的功能需求，你也可以自己编写自己的插件逻辑以实现自己所需功能,详见[编写插件](/start/plugin)
