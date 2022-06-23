import { Bot, Plugin } from 'oitq'
import { Loader } from '@oitq/cli'

declare module '@oitq/service-console' {
    interface Events {
        'manager/app-reload'(config: any): void
        'manager/plugin-reload'(name: string, config: any): void
        'manager/plugin-unload'(name: string, config: any): void
        'manager/bot-update'(config: Bot.Config): void
        'manager/bot-add'(config:Bot.Config):void
        'manager/bot-login'(uin:string,type:'password'|'slider'|'sms',value?:string):void
        'manager/bot-remove'(uin: string): void
    }
}

export default class ConfigWriter {
    private loader: Loader
    private plugins: {}
    static using:readonly (keyof Plugin.Services)[]=['CLI'] as any
    constructor(private ctx: Plugin) {
        this.loader = ctx.loader||ctx.app.loader
        this.plugins = ctx.app.config.plugins

        ctx.console.addListener('manager/app-reload', (config) => {
            this.reloadApp(config)
        }, { authority: 4 })

        ctx.console.addListener('manager/plugin-reload', (name, config) => {
            this.reloadPlugin(name, config)
        }, { authority: 4 })

        ctx.console.addListener('manager/plugin-unload', (name, config) => {
            this.unloadPlugin(name, config)
        }, { authority: 4 })

        ctx.console.addListener('manager/bot-add', (config) => {
            this.addBot(config)
        }, { authority: 4 })
        ctx.console.addListener('manager/bot-login',(uin,type,value)=>{
            return this.loginBot(uin,type,value?value:undefined)
        },{authority:4})
        ctx.console.addListener('manager/bot-update', (config) => {
            this.updateBot(config)
        }, { authority: 4 })

        ctx.console.addListener('manager/bot-remove', (id) => {
            this.removeBot(id)
        }, { authority: 4 })
    }

    reloadApp(config: any) {
        this.loader.config = config
        this.loader.config.plugins = this.plugins
        this.loader.writeConfig()
        this.loader.fullReload()
    }

    reloadPlugin(name: string, config: any) {
        delete this.plugins['~' + name]
        this.plugins[name] = config
        this.loader.writeConfig()
        this.loader.reloadPlugin(name)
    }

    unloadPlugin(name: string, config: any) {
        delete this.plugins[name]
        this.plugins['~' + name] = config
        this.loader.writeConfig()
        this.loader.unloadPlugin(name)
    }
    addBot(config:Bot.Config){
        if(this.ctx.bots.get(config.uin)) return this.updateBot(config)
        this.loader.config.bots.push(config)
        this.ctx.app.addBot(config)
        this.loader.writeConfig()
    }
    loginBot(uin:string,type:'password'|'slider'|'sms',value?:string){
        const bot=this.ctx.bots.get(uin)
        if(!bot) throw new Error('未知的bot:'+uin)
        return new Promise((resolve, reject) => {
            const disposeArr=[
                this.ctx.on('bot.system.online',()=>{
                    disposeArr.forEach(dispose=>dispose())
                    resolve({success:true,message:'登录成功',data:''})
                }),
                this.ctx.on('bot.system.login.device',()=>{
                    disposeArr.forEach(dispose=>dispose())
                    bot.sendSmsCode()
                    resolve({
                        data:'',
                        reason:'device',
                        success:false,
                        message:'收到设备验证，请输入该账号绑定手机收到的验证码'
                    })
                }),
                this.ctx.on('bot.system.login.qrcode',(session)=>{
                    disposeArr.forEach(dispose=>dispose())
                    resolve({
                        data:`data:image/png;base64,${session.image.toString('base64')}`,
                        reason:'qrcode',
                        success:false,
                        message:'收到登录二维码，请扫码后继续'
                    })
                }),
                this.ctx.on('bot.system.login.slider',(session)=>{
                    disposeArr.forEach(dispose=>dispose())
                    resolve({
                        data:`请通过下面的url获取ticket后继续\n${session.url}`,
                        reason:'slider',
                        success:false,
                        message:'滑块验证'
                    })
                }),
                this.ctx.on('bot.system.login.error',(session)=>{
                    disposeArr.forEach(dispose=>dispose())
                    resolve({
                        data:session.code,
                        reason:session.message,
                        success:false,
                        message:'登录失败'
                    })
                }),
            ];
            switch (type){
                case "password":
                    bot.login(value)
                    break;
                case "slider":
                    bot.submitSlider(value)
                    break;
                case 'sms':
                    bot.submitSmsCode(value)
                    break;
                default:
                    reject(new Error('无效的类型'))
            }
        })
    }
    updateBot(config: Bot.Config) {
        let bot: Bot = this.ctx.bots.find(bot => bot.uin === config.uin)
        if(!bot)return
        const index=this.loader.config.bots.findIndex(c=>c.uin===config.uin)
        if(index>=0)this.loader.config.bots.splice(index,1)
        this.loader.config.bots.push(config)
        this.ctx.app.removeBot(config.uin)
        this.ctx.app.addBot(config)
        this.loader.writeConfig()
    }

    removeBot(uin: string) {
        const bot=this.ctx.bots.get(uin)
        if(!bot)return;
        const index=this.loader.config.bots.findIndex(c=>c.uin===uin)
        if(index>=0)this.loader.config.bots.splice(index,1)
        this.ctx.app.removeBot(uin)
        this.loader.writeConfig()
    }
}
