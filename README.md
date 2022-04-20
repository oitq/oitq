# oitq
用于生产环境部署oicq
## 安装
```shell
npm install oitq
# or
yarn add oitq
```
## 样例
1.javascript
```javascript
const {createApp} =require('oitq')
createApp().start(8080)

```
2.typescript

```typescript
import {createApp} from 'oitq'
createApp().start(8080)

```
## Interface/Type
```typescript
type LoginType='qrcode'|'password'
type Path=string|RegExp
interface App extends Context{
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
    port?:number,
    path?:string
    bots?:BotOptions[]
    delay?:Dict<number>
    admins?:number[]
    logLevel?:LogLevel
    maxListeners?:number,
}
interface BotOptions{
    uin?:number
    config:Config,
    type:LoginType
    password?:string
    master?:number // 当前机器人主人
    admins?:number[] // 当前机器人管理员
    parent?:number // 机器人上级
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

1.全局安装`oitq`
```shell
npm install -g oitq
oitq add //开启一个添加账号流程
oitq remove // 开启一个移除账号流程
oitq start // 启动项目 
```
2.如果不想全局安装，可使用软连接激活cli指令
```shell
npm install oitq
npm link oitq
oitq add //开启一个添加账号流程
oitq remove // 开启一个移除账号流程
oitq start // 启动项目 
```
