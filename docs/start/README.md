# 快速上手
oitq提供两种工作模式可供开发者选择：

## 仅作为bot服务提供者工作
在这种模式下，你可以使用任何编程语言编写自己的机器人功能
1.新建一个node项目
```shell
mkdir server // 建立文件夹
cd server
npm init -y // 初始化node项目
```
2.安装oitq作为项目依赖
```shell
npm install oitq
```
3.在项目中建立index.js,并便携一下代码到里面
```javascript
const {createApp}=require('oitq')
createApp().start(8080)
//start中的8080代表oitq服务监听的端口，也可以改成你想监听的端口
```
4.启动项目
```shell
node ./index.js
```
至此，oitq作为服务提供者已完成，
控制台打印的监听的地址即为服务提供地址（后续简称baseUrl）。

你可通过post请求`baseUrl+'/add'`添加一个bot，
请求参数为你需要登录的bot配置，具体请看[BotConfig](/config/bot)
你可通过get请求`baseUrl+'/remove?uin=你的机器人qq`移除一个bot
### bot添加后提供的服务
若你添加bot时提供了oneBot配置项并且oneBot的配置项中use_http和use_ws为true，
oitq会在`baseUrl+/:你的机器人qq`添加一个httpApi服务和websocket服务。

你可以通过get或post请求`baseUrl+/:你的机器人qq/:action`来控制bot发送消息，
通过websocket连接`baseUrl+/:你的机器人qq/`来监听bot发送过来的事件。

（注：此时的baseUrl为`ws://...`，不再是http协议）
## 作为插件开发框架编写自己的机器人服务

