# 编写插件
## 语言
oitq允许你使用ts或js编写自己的插件逻辑，这能让用户更自由的选择自己熟悉的开发语言
## 规范
oitq规定插件可以为一个接收1-2个参数的函数或一个带install函数且install函数接收1-2个参数的对象

在插件安装时会传递父插件Plugin实例和配置文件见作为函数的参数

在函数内，你可使用父插件实例定义自己的指令，定义子指令，添加事件监听，具体见[Plugin](/interface/plugin)

例

函数形式
```typescript
//js
module.exports=(parent,config)=>{
    parent.on('bot.message',(session)=>{
        if(session.cqCode==='hello'){
            session.reply('world')
        }
    })
    parent.command('念诗','message')
        .desc('测试指令')
        .action(({session})=>{
            return `明月西风雕碧树，独上高楼，望尽天涯路`
        })
}
//ts
import {Plugin} from 'oitq'
export default function (parent:Plugin){
    parent.on('bot.message',(session)=>{
        if(session.cqCode==='hello'){
            session.reply('world')
        }
    })
    parent.command('念诗','message')
        .desc('测试指令')
        .action(({session})=>{
            return `明月西风雕碧树，独上高楼，望尽天涯路`
        })
}
```
对象形式
```typescript
// js
module.exports={
    install(parent,config){
        parent.on('bot.message',(session)=>{
            if(session.cqCode==='hello'){
                session.reply('world')
            }
        })
        parent.command('念诗','message')
            .desc('测试指令')
            .action(({session})=>{
                return `明月西风雕碧树，独上高楼，望尽天涯路`
            })
    }
}
// ts
import {Plugin} from 'oitq'

export function install(parent:Plugin){
    parent.on('bot.message',(session)=>{
        if(session.cqCode==='hello'){
            session.reply('world')
        }
    })
    parent.command('念诗','message')
        .desc('测试指令')
        .action(({session})=>{
            return `明月西风雕碧树，独上高楼，望尽天涯路`
        })
}
```
## 插件嵌套
你可以，在插件内通过调用parent.plugin添加当前插件的子插件
例
```typescript
//js
function childPlugin(parent){
    parent.command('parent/child','message')
        .desc('这是子插件')
        .action(()=>{
            return '我是子插件'
        })
}
module.exports=(parent)=>{
    parent.command('parent','message')
        .desc('这是父插件')
        .action(()=>{
            return '我是父插件'
        })
    parent.plugin(childPlugin)
}
```
父插件卸载或禁用时，子插件相关功能将自动被禁用或卸载
