# oicq-bots
用于生产环境部署oicq
## 安装
```shell
npm install @lc-cn/oicq-bots
# or
yarn add @lc-cn/oicq-bots
```
## 样例
1.javascript
```javascript
const {App} = require('@lc-cn/oicq-bots')
const app=new App()
// addBot
app.addBot({
    uin:123456789,
    password:'11111111',
    access_token:'abc',//web服务访问token
    config:{
        platform:5
    },
    use_ws:true,//是否启用websocket服务
})
app.listen(8080)//start webserver
```
2.typescript

```typescript
import {App, AppOptions,BotOptions} from "@lc-cn/oicq-bots";
const app:App=new App({
    bots:[
        {
            uin:123456789,
            password:'11111111',
            access_token:'abc',//web服务访问token
            config:{
                platform:5
            },
            use_ws:true,//是否启用websocket服务
        }
    ]
})
app.listen(8080)
```
## Class:App
> 继承自Koa类，拥有Koa上所有方法和属性

|Method|Description|args|
|:---|:---|:---|
|constructor|构造函数|options:AppOptions|
|addBot|新增一个Bot|option:BotOptions|
|removeBot|移除一个Bot|uin:number|

|property|Description|type|
|:---|:---|:---|
|bots|bot容器|BotList|
|router|项目路由|Router|
## Class Bot
> 继承自oicq的Client类，拥有Client类的所有方法和属性

|Method|Description|args|
|:---|:---|:---|
|constructor|构造函数|options:BotOptions|
## Class Router
> 继承自KoaRouter类，拥有KoaRouter类所有方法和属性

|Method|Description|args|
|:---|:---|:---|
|ws|添加一个ws监听|path: Path或Path[], callback?: WsCallback|

|property|Description|type|
|:---|:---|:---|
|wsStack|ws监听存放容器|WsServer[]|
|whiteList|每生成一个route，会往里面存入一个Path，可用于historyApi的whitelist|Path|
## Class WsServer
> 创建一个ws服务

|Method|Description|args|
|:---|:---|:---|
|constructor|构造函数|router:Router,path:Path或Path[],callback?:(socket:Websocket,request)=>void|
|accept|收到wsMessage时调用|uin:number,socket:Websocket,request|
|close|关闭socket服务||

|property|Description|type|
|:---|:---|:---|
|clients|ws连接存放容器|Set<Websocket>|
|regexp|ws地址正则|Regexp|
## Class BotList
> 继承自原生Array类，拥有Array类的所有方法和属性

|Method|Description|args|
|:---|:---|:---|
|get|获取指定uin的bot|uin:number|
|create|根据options创建一个bot|options:BotOptions|
|remove|移除指定uin的bot|uin:number|
## Interface/Type
```typescript
type LoginType='qrcode'|'password'
type Path=string|RegExp
interface App extends Koa{
    constructor(options?:AppOptions):App
    addBot(options:BotOptions):Bot
    removeBot(uin:number):void
}
interface AppOptions{
    env?: string | undefined,
    keys?: string[] | undefined,
    proxy?: boolean | undefined,
    subdomainOffset?: number | undefined,
    proxyIpHeader?: string | undefined,
    maxIpsCount?: number | undefined
    path?:string
    bots?:BotOptions[]
}
interface BotOptions{
    uin:number
    config:Config,
    type:LoginType
    password?:string
    access_token?:string
    secret?:string
    enable_heartbeat?:boolean
    heartbeat_interval?:number
    use_ws?:boolean
}
```