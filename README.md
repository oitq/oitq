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
const {App} =require('@lc-cn/oicq-bots')
const fs = require('fs')
const path = require('path')
const configPath=path.join(process.cwd(),'oicq.config.json')
const appOption=JSON.parse(fs.readFileSync(configPath,{encoding:"utf-8"}))
const app=new App(appOption)
app.start(8086)

```
2.typescript

```typescript
import {App,AppOptions} from '../src'
import * as fs from 'fs'
import * as path from "path";
const configPath=path.join(process.cwd(),'oicq.config.json')
const appOption:AppOptions=JSON.parse(fs.readFileSync(configPath,{encoding:"utf-8"}))
const app=new App(appOption)
app.start(8086)

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
|ws|添加一个ws监听|path: String, server: HttpServer|

|property|Description|type|
|:---|:---|:---|
|wsStack|ws监听存放容器|WebsocketServer[]|
|whiteList|每生成一个route，会往里面存入一个Path，可用于historyApi的whitelist|Path|
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
interface KoaOptions{
    env?: string | undefined,
    keys?: string[] | undefined,
    proxy?: boolean | undefined,
    subdomainOffset?: number | undefined,
    proxyIpHeader?: string | undefined,
    maxIpsCount?: number | undefined
}
interface AppOptions extends KoaOptions{
    path?:string
    bots?:BotOptions[]
}
interface BotOptions{
    uin:number
    config:Config,
    type:LoginType
    password?:string
    oneBot?:boolean|OneBotConfig//传true时将使用默认配置
}
interface OneBotConfig{
    use_http?: boolean,
    use_ws?: boolean,
    access_token?: string,
    secret?: string,
    post_timeout: number,
    post_message_format: "string" | "array"
    enable_cors?: boolean,
    event_filter: string,
    enable_heartbeat?: boolean,
    heartbeat_interval?: number,
    rate_limit_interval?: number,
    post_url?: string[],
    ws_reverse_url?: string[],
    ws_reverse_reconnect_interval?: number,
    use_cqhttp_notice?: boolean,
}
export const defaultOneBotConfig={
    use_cqhttp_notice: true,
    use_http: true,
    use_ws: true,
    access_token: "",
    secret: "",
    post_timeout: 30,
    post_message_format: "array",
    enable_cors: true,
    event_filter: "",
    enable_heartbeat: true,
    heartbeat_interval: 15000,
    rate_limit_interval: 500,
    post_url: [],
    ws_reverse_url: [],
    ws_reverse_reconnect_interval: 3000,
}
```
## cli
项目增加了cli指令，用于增加/删除和启动项目
### usage
此处提供两种用法：

1.全局安装`@lc-cn/oicq-bots`
```shell
npm install -g @lc-cn/oicq-bots
oitq add //开启一个添加账号流程
oitq remove // 开启一个移除账号流程
oitq start // 启动项目 
```
2.如果不想全局安装，可使用软连接激活cli指令
```shell
npm install @lc-cn/oicq-bots
npm link @lc-cn/oicq-bots
oitq add //开启一个添加账号流程
oitq remove // 开启一个移除账号流程
oitq start // 启动项目 
```
