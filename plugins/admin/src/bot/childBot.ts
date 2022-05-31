import {Bot, NSession, Plugin} from "oitq";
import {DataTypes} from "@oitq/service-database";
import {segment} from "oicq";
export const using=['database'] as const
async function loginBot(session:NSession,bot:Bot,password):Promise<[boolean,string]>{
    return new Promise<[boolean, string]>(resolve=>{
        const disposes=[
            session.app.on('bot.system.online',(sess)=>{
                if(sess.bot!==bot) return
                disposes.forEach(dispose=>dispose())
                resolve([true,null])
            }),
            session.app.on('bot.system.login.qrcode',async (sess)=>{
                if(sess.bot!==bot) return
                const {confirm}=await session.prompt({
                    type:'confirm',
                    name:'confirm',
                    message:['请扫描登录二维码后回复任意内容继续\n',segment.image(sess.image)]
                })
                if(!confirm) return resolve([false,'用户取消登录'])
                bot.login(password)
            }),
            session.app.on('bot.system.login.device',async (sess)=>{
                if(sess.bot!==bot) return
                bot.sendSmsCode()
                const {sms}=await session.prompt({
                    type:'text',
                    name:'sms',
                    message:'请输入你手机收到的验证码后继续'
                })
                if(!sms) return
                bot.submitSmsCode(sms)
            }),
            session.app.on('bot.system.login.error',async (sess)=>{
                if(sess.bot!==bot) return
                if((sess.message as unknown as string).includes('密码错误')){
                    const {newPass}=await session.prompt({
                        type:'text',
                        name:'newPass',
                        message:'密码错误，请重新输入（输入cancel可取消）'
                    })
                    if(!newPass) {
                        resolve([false,'输入超时，已取消'])
                        disposes.forEach(dispose=>dispose())
                    }
                    if(newPass==='cancel') {
                        resolve([false,'已取消'])
                        disposes.forEach(dispose=>dispose())
                    }
                    bot.login(newPass)
                }else{
                    resolve([false,sess.message as unknown as string])
                    disposes.forEach(dispose=>dispose())
                }
            }),
        ]
        bot.login(password)
    })
}
export function install(plugin:Plugin){
    plugin.app.before('database.ready',()=>{
        plugin.database.define('Bot',{
            uin:DataTypes.INTEGER,
        })
        plugin.database.extend('User',{
            bots:{
                type:DataTypes.TEXT,
                get(){
                    return JSON.parse(this.getDataValue('bots')||'[]')||[]
                },
                set(value:number[]){
                    this.setDataValue('bots',JSON.stringify(value) as any)
                }
            }
        })
    })
    plugin.app.before('database.sync',()=>{
        const {Bot} = plugin.database.models
        Bot.hasMany(Bot,{as:'children'})
        Bot.belongsTo(Bot,{as:'parent'})
    })
    plugin.command('admin/bot','message.private')
        .desc('管理子账户')
    plugin.command('admin/bot/bot.login','message.private')
        .desc('登录子账户')
        .option('type','-t <loginType:string> 登录方式(password or qrcode)',{initial:'password'})
        .option('platform','-p <platform:integer> 登录协议(1-5)，详见oicq文档',{initial:1})
        .action(async ({session,options})=>{
            const {uin,password}=await session.prompt([
                {
                    type:'number',
                    message:'请输入uin',
                    name:'uin'
                },
                {
                    type:options.type==='qrcode'?null:'text',
                    message:'请输入密码',
                    name:'password'
                }
            ])
            if(plugin.app.bots.get(uin as number)) return `uin(${uin})已存在`
            const bot=plugin.app.addBot({uin:Number(uin),master:session.user_id,config:{platform:options.platform}})
            const [success,err]=await loginBot(session,bot,password)
            if(success) return '登录成功'
            plugin.app.removeBot(bot.uin)
            return err
        })
}
