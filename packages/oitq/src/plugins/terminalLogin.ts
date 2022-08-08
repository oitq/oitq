import {Plugin} from "oitq";
const terminalLogin=new Plugin('terminalLogin',__filename)
terminalLogin.appendTo('builtin')
terminalLogin.on('oicq.system.login.device',session=>{
    console.log('请输入该账号绑定的手机号收到的验证码后回车继续：')
    session.bot.sendSmsCode()
    process.stdin.once("data",(data)=>{
        session.bot.submitSmsCode(data.toString())
    })
})
terminalLogin.on('oicq.system.login.qrcode',session=>{
    console.log('请扫描二维码完成登录确认后回车继续：')
    process.stdin.once('data',()=>{
        session.bot.login()
    })
})
terminalLogin.on('oicq.system.login.slider',session=>{
    console.log('请完成滑块并输入ticket后回车继续：')
    process.stdin.once("data",(data)=>{
        session.bot.submitSlider(data.toString())
    })
})
