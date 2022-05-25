:::tip
以下为oitq的两种工作模式快速上手，任选其一即可
:::
## 作为服务提供者
此模式下，oitq只提供httpAPI服务，你需要自行选择你熟悉的编程语言编写插件调用oitq的httpAPI服务
### 使用模板项目
如果你有[github](https://github.com)账号，我们推荐你使用模板项目的方式快速启动oitq的httpAPI服务
#### 1.拉取代码
```shell
git clone https://github.com/oitq/server.git && cd server && npm install
```
#### 2.启动
```shell
npm start
```
### 使用包管理器创建
```shell
npm init oitq -t oitq/server #或 yarn create oitq -t oitq/server
```
根据流程提示即可完成项目创建
### 代码起步
如果没有github账号无法拉取代码或包管理器无法创建，你也可使用以下流程初始化你的项目
#### 1.新建项目
```shell
mkdir <项目名称> && cd <项目名称>
```
#### 2.初始化项目
```shell
npm init -y
```
#### 3.安装oitq所需依赖
```shell
npm install oitq @oitq/plugin-http-server @oitq/plugin-one-bot -S
```
#### 4.启动
```shell
npm start
```
完成后，你即可访问httpAPI对bot进行添加删除操作，在bot添加并成功登陆后，你还可调用bot提供的httpAPI服务，
更多详情，请访问[以服务提供者工作](/start/server)
## 作为插件开发框架
### 从模板仓库创建
如果你有[github](https://github.com)账号，我们推荐你使用模板仓库快速创建属于你自己的oitq项目
1. 点击[这里](https://github.com/oitq/app/generate)创建仓库副本
2. 使用git clone 你刚刚创建的仓库副本
3. 命令行输入`npm install`或`yarn` 安装依赖
4. 命令行输入`npm start`或`yarn start` 启动项目
### 使用包管理器创建
```shell
npm init oitq #或 yarn create oitq 
```
根据流程提示即可完成项目创建
### 代码起步
如果没有github账号无法拉取代码或包管理器无法创建，你也可使用以下流程初始化你的项目
#### 1.新建项目
```shell
mkdir <项目名称> && cd <项目名称>
```
#### 2.初始化项目
```shell
npm init -y
```
#### 3.安装oitq所需依赖
```shell
npm install oitq @oitq/cli -S
```
#### 4.创建配置文件oitq.config.json并填入以下内容
```json5
{
    "bots": [
        {
            "uin": 210723495 // 你的qq
        }
    ],
    "plugins": {
        "help": true,//启用系统内置的帮助插件
        "example": true //启用example插件，为你本地插件目录目录(plugin_dir处定义)下的插件文件名
    },
    "delay": {
        "prompt": 6000 //配置prompt超时时间(单位:ms)
    },
    "plugin_dir": "plugins",//你本地插件存放的目录
    "port": 8086 //oitq监听端口
}
```
#### 5.在package.json添加启动命令
```json5
{
  // ...
  scripts: {
    //...
    "start": "oitq start . -r esbuild-register -r tsconfig-paths/register",
    "dev": "oitq start . --watch --log-level info -r esbuild-register -r tsconfig-paths/register",
    // ...
  },
  // ...
}
```
#### 6.创建插件目录和插件文件
```shell
mkdir plugins # 此处的目录名称需与oitq.config.json中的plugin_dir一致，才能正确读取插件
cd plugins && touch example.js # 此处的插件文件名需与oitq.config.json中的plugins中配置的key值相同才能正确启用插件
```
#### 7.编写插件逻辑
```javascript
module.exports = {
    install(plugin) {//插件安装方法
        // 定义指令
        plugin.command('录入信息', 'message')
            .desc('prompt样例')
            .action(async ({session}) => {
                const result=await session.prompt([
                    {
                        type:'text',
                        name:'name',
                        message:'请输入用户名',
                    },
                    {
                        type:'number',
                        name:'age',
                        message:'请输入年龄'
                    },
                    {
                        type:'select',
                        name:'sex',
                        message:'请选择性别',
                        choices:[{title:'男',value:'male'},{title:'女',value:'female'}]
                    }
                ])
                return ['你录入的信息为：\n',JSON.stringify(result,null,2)]
            })
        // 监听事件
        plugin.on('bot.message',(session) => {
            if(session.cqCode==='你好'){
                session.reply('哈哈哈哈')
            }
        })
    }
}

```
#### 8.启动
```shell
npm start
```
完成后，你即可访问httpAPI对bot进行添加删除操作，在bot添加并成功登陆后，你还可调用bot提供的httpAPI服务，
更多详情，请访问[以插件开发框架工作](/start/framework)

