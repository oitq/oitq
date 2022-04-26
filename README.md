# oitq
用于生产环境部署oicq
## 安装
```shell
npm install oitq
# or
yarn add oitq
```
## 样例

```typescript
import {createApp,Context} from 'oitq'
const echo={
    name:'echo',
    install:(ctx,config)=>{
        // 添加一个echo指令
        ctx.command('echo','输出信息')
            .action(async ({session})=>{
                // 调起使用prompt可以监听用户下一次的输入作为本次的参数继续执行，
                // prompt配置具体见Prompt介绍
                const {message} = await session.prompt({
                    type:'text',
                    message:'请输入你需要输出的信息',
                    name:'message'
                })
                if(message){
                    session.reply(message)
                }
            })
    }
}
// createApp可以传AppOptions对象，也可以是josn文件路径，不传时默认为电脑home目录下的.oitq/oitq.json
const app=createApp({
    dir:'./plugins',//你自己写的插件在哪个目录
    bots:[
        {
            uin:147258369,//登录bot账号
            type:'qrcode',//登录方式，可选password/qrcode,当为password时，需配置password字段
            admins:[],//管理此bot的qq号数组
            config:{
                platform:5,//登录平台
            },
            oneBot:false,//是否启用oneBot，可传boolean或OneBotConfig
        }
    ]
})
// 已函数形式添加一个插件
app.plugin((ctx:Context)=>{
    // 监听私聊消息
    ctx.on('bot.message.friend',(session)=>{
        if(session.cqCode==='test'){
            return 'hello world'
        }
    })
})
// 传入name字符串时，程序会自己去查找符合名字的插件进行安装
// 查找顺序
// 1.appOption传入的dir目录
// 2.名称为`oitq-plugin-${name}`的npm包
// 3.名称为`@oitq/plugin-${name}`的npm包
app.plugin('example')
// 如果传入的是一个对象，则安装插件时会自动执行对象上的install方法
app.plugin(echo,{auth:1})
app.start(8080)
```
## 编写插件
oitq 规定插件为函数类型或带有install函数的对象，
在调用app.plugin时，oitq将会生成一个全新的上下文作为参数传递给插件
，如果你调用app.plugin时传入了第二个参数，那么他也会作为config传入到插件里
在插件内部，你可通过上下文上提供的各种方法和服务来编写你自己的逻辑

```typescript
// example.ts
import {Context} from 'oitq'
export function install(ctx:Context){
    ctx.on('bot.group.message',(session)=>{
        // oitq将会自动将收到的消息转为CQ码存到会话的cqCode字段上，
        // 你也可以使用session.message 获取原来的message
        if(session.cqCode==='123'){
            // 如果回调函数有返回值且返回值为string类型，程序会自动将返回值作为消息发送至对应群
            // 你也可以手动调用session.reply(message)进行快速回复
            return '456'
        }
    })
}
```
## prompt
为了实现qq应答式的让用户输入信息，oitq在session上添加了prompt函数，你可以通过调用让用户输入一些信息

prompt接收一个Option或Option数组，为数组时可同时让用户输入多次
```typescript

interface TypeKV{
    text:string,
    any:any
    video:VideoElem
    image:ImageElem
    face:FaceElem
    number:number,
    list:any[]
    confirm:boolean
    date:Date
    select:any
    multipleSelect:any[]
}
interface Option<T extends keyof TypeKV>{
    type:T | Falsy | PrevCaller<T,T|Falsy>,// 必填，可以使TypeKV的key值或一个返回值为TypeKv的key值得函数
    name?:string,//必填，多个问题时，name应具有唯一性
    message?:Sendable,//可选 提示用户输入的文本，没传则会依据label、prefix、action拼接以提示用户，拼接规则(prefix+action+label)
    label?:Sendable,//可选,没传则为name
    prefix?:string,//可选
    action?:string,//可选
    validate?:(message:Sendable)=>boolean,//可选 用户输入值校验函数
    errorMsg?:string,// 可选 校验出错时提示用户的错误信息
    separator?:string|PrevCaller<T, string>,// 可选 当type为list或multipleSelect时为必传，确定值之间的分隔标识
    choices?:ChoiceItem[]|PrevCaller<T,ChoiceItem[]>,// 可选 当type为select或multipleSelect时必传，提供个用户选择的列表，
    initial?:ValueType<T>|PrevCaller<T, ValueType<T>>,// 可选，选项的默认值
    timeout?:number,// 可选，用户输入超时的时间毫秒数，默认为createApp时传入的delay.prompt值
    format?:(value:ValueType<T>)=>ValueType<T>,// 可选，对用户返回值进行格式化的函数
}
interface ChoiceItem{
    title:string,
    value:any
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
