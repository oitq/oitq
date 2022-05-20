# 阅读此章节前，请确保你已根据[快速上手](/start/)配置后能正常启动oitq
# 提供的服务
:::tip
以下baseUrl为你`http(s)://`+服务地址(本地为`localhost`或`127.0.0.1`，服务器为你服务器ip或绑定的域名)+服务监听端口(httpServer插件配置的port)+你的机器人uin

例：`http://localhost:8086`

以下wsUrl为你`ws(s)://`+服务地址(本地为`localhost`或`127.0.0.1`，服务器为你服务器ip或绑定的域名)+服务监听端口(httpServer插件配置的port)+你的机器人uin

例：`ws://localhost:8086`
:::
## 添加一个Bot
post请求`baseUrl+'/add'`,请求body为你要登录的机器人配置，具体请看[BotConfig](/config/bot)
例：axios
```javascript
axios.post('http://localhost:8086/add',{
    uin: 1234567890,
    password: '*********',
    type: "password",
    config: {platform: 5},
    oneBot: true//可传对象，true为使用默认Onebot配置
})
```
### 移除Bot
get请求`baseUrl+'/remove'`,请求params为`{uin:你要移除的机器人uin}`

例：axios
```javascript
axios.get('http://localhost:8086/remove',{
    params:{uin:123456789}
})
```
### bot添加后提供的服务
:::tip
若你添加bot时提供了oneBot配置项并且oneBot的配置项中use_http和use_ws为true(传true是默认启动)，会为你生成一个http服务地址(`baseUrl+机器人uin`)和一个ws服务地址(`baseUrl+机器人uin`)

例:

http服务地址：`http://localhost:8086/123456789`

ws服务地址：`ws://localhost:8086/123456789`

[ws连接在线测试地址](http://www.websocket-test.com)
:::
#### 登录相关
通过ws服务地址，你可接收到bot推送过来的事件，通过筛选返回JSON中post_type为system的系统事件，
你可获取到登录过程中的验证数据。在验证通过后使用http服务地址提交验证结果给oitq，可辅助bot登录
##### 登录
你可通过post请求`baseUrl+/login/:机器人uin`登录你的bot，请求body为`{password}`，没有password则为扫码登陆

例：axios
```javascript
axios.post('http://localhost:8086/login/123456789',{
    password:'********'
})
```
:::tip
在添加bot后，并成功连接上ws服务地址后，你需要手动调用登录后才能收到登录相关验证
:::
##### 处理滑块验证
在收到滑块验证的验证url后，你可通过[滑块验证助手](https://github.com/mzdluo123/TxCaptchaHelper)获取ticket。

通过post请求`baseUrl+/submitSlider/:机器人uin/`提交ticket，请求body为`{ticket}`

例:axios
```javascript
axios.post('http://localhost:8086/submitSlider/123456789',{
    ticket:'123123123'
})
```
:::tip
提交成功后，你可重新调用登录方法再次尝试登录,登录成功以ws服务推送的数据为准
:::
##### 处理短信验证
在你收到短信验证码时，你可通过post请求`baseUrl+/submitSmsCode/:机器人uin`提交，请求body为`{sms}`

例:axios
```javascript
axios.post('http://localhost:8086/submitSmsCode/123456789',{
    sms:'8888'
})
```
:::tip
提交成功后，你可重新调用登录方法再次尝试登录,登录成功以ws服务推送的数据为准
:::
