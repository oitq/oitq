:::tip
1. 使用new App实例化一个应用时，应用配置为必填项
2. 使用createApp实例化一个应用时，应用配置为可选项，不传则使用默认配置
3. 使用createApp时，可以传入配置文件所在的路径，程序会自动读取配置文件

:::
## 配置解释
应用配置为一个对象，包含以下属性：
| 属性 | 类型 | 描述 |
| ---- | ---- | ---- |
| logLevel | `info`/`none`/`debug` | 日志输出级别 |
| bots | [Bot.Config](/config/bot)[] | 机器人配置数组 |
| plugins | Record<string,any> | 插件配置数组 |
| services | Record<string,any> | 服务配置数组 |
| delay | Record<string,number> | 延时配置，单位秒 |
| plugin_dir | `string` | 插件目录配置 |
| service_dir | `string` | 服务目录配置 |
## 默认配置
```json
{
    "bots":[],
    "logLevel":"info",
    "plugins":{},
    "delay":{
        "prompt":60000
    }
}
```
