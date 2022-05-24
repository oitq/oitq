import {Plugin,template, s, fromCqcode,Dict,sleep,makeArray} from "oitq";
import {OnlineStatus, segment} from "oicq";
import * as callme from './callme'
import * as music from './music'
template.set('common', {
    'expect-text': '请输入要发送的文本。',
    'expect-command': '请输入要触发的指令。',
    'expect-context': '请提供新的上下文。',
    'platform-not-found': '找不到指定的平台。',
    'invalid-private-member': '无法在私聊上下文使用 --member 选项。',
    'feedback-receive': '收到来自 {0} 的反馈信息：\n{1}',
    'feedback-success': '反馈信息发送成功！',
})
export interface RecallConfig {
    recall?: number
}
export interface Respondent {
    match: string | RegExp
    reply: string | ((...capture: string[]) => string)
}
export interface BasicConfig extends RecallConfig {
    echo?:boolean
    send?: boolean
    feedback?: number | number[]|{
        operator:number|number[]
        timeout?:number
    }
    respondent?: Respondent | Respondent[]
}
export function echo(plugin:Plugin){
    plugin.command('common/echo <varName:string>','message')
        .desc('输出当前会话中的变量值')
        .action(async ({session},varName)=>{
            let result:any=session
            if(!varName)return '请输入变量名'
            if(varName.endsWith(')') && !session.bot.isMaster(session.user_id)) return `禁止调用函数:this.${varName}`
            let varArr=varName.split('.')
            if(!session.bot.isMaster(session.user_id) && varArr.some(name=>['options','bot','app','config','password'].includes(name))){
                return `不可达的位置：${varName}`
            }
            try{
                const func=new Function(`return this.${varArr.join('.')}`)
                result =func.apply(session)
            }catch(e){
                if(result===undefined)e.stack='未找到变量'+varName
                throw e
            }
            if(result===undefined)throw new Error('未找到变量'+varName)
            return JSON.stringify(result,null, 4).replace(/"/g,'')
        })
}
export function send(plugin: Plugin) {
    plugin.command('common/send <message:text>', 'message')
        .desc('向当前上下文发送消息')
        .option('anonymous', '-a  匿名发送消息')
        .option('forceAnonymous', '-A  匿名发送消息')
        .option('escape', '-e  发送转义消息')
        .option('user', '-u [user:number]  发送到用户')
        .option('group', '-g [group:number]  发送到群')
        .option('discuss', '-d [discuss:number]  发送到讨论组')
        .action(async ({session, options }, message) => {
            if (!message) return template('common.expect-text')

            if (options.escape) {
                message = s.unescape(message)
            }
            const {bot}=session
            if (options.forceAnonymous) {
                message = s('anonymous') + message
            } else if (options.anonymous) {
                message = s('anonymous', { ignore: true }) + message
            }

            if(options.user){
                await bot.sendPrivateMsg(options.user, fromCqcode(message))
                return
            }
            if(options.group){
                await bot.sendGroupMsg(options.group,fromCqcode(message))
                return
            }
            if(options.discuss){
                await bot.sendDiscussMsg(options.discuss,fromCqcode(message))
                return
            }
            return message
        })
}
export function recall(plugin: Plugin, { recall = 10 }: RecallConfig) {
    const recent: Dict<string[]> = {}
    plugin.app.on('send', (messageRet,channelId) => {
        const list = recent[channelId] ||= []
        list.unshift(messageRet.message_id)
        if (list.length > recall) {
            list.pop()
        }
    })
    plugin
        .command('common/recall [count:number]','message')
        .desc('撤回机器人发送的消息')
        .action(async ({ session }, count = 1) => {
            const list = recent[session.getChannelId()]
            if (!list) return '近期没有发送消息。'
            const removal = list.splice(0, count)
            const delay = plugin.app.config.delay.broadcast
            if (!list.length) delete recent[session.getChannelId()]
            for (let index = 0; index < removal.length; index++) {
                if (index && delay) await sleep(delay)
                try {
                    await session.bot.deleteMsg(removal[index])
                } catch (error) {
                    plugin.getLogger('bot').warn(error)
                }
            }
        })
}
export function feedback(plugin: Plugin, {operators,timeout=1000*60*60}: { operators:number[],timeout?:number }) {
    async function createReplyCallback(session,user_id){
        const sess=await session.bot.waitMessage((temp)=>temp.message_type==='private' && temp.user_id===user_id,timeout)
        if(!sess)return
        session.reply(['来自作者的回复：\n',...sess.message],true)
    }
    plugin.command('common/feedback <message:text>', 'message')
        .desc('发送反馈信息给作者')
        .action(async ({ session }, text) => {
            if (!text) return template('common.expect-text')
            const name=session.sender['card']||session.sender['title']||session.sender.nickname||session.nickname

            const fromCN={
                group:()=>`群：${session['group_name']}(${session.group_id})的${name}(${session.user_id})`,
                discuss:()=>`讨论组：${session['discuss_name']}(${session.discuss_id})的${name}(${session.user_id})`,
                private:()=>`用户：${name}(${session.user_id})`
            }
            const message = template('common.feedback-receive',`${fromCN[session.message_type]()}` , text)
            const delay = plugin.app.config.delay.broadcast
            for (let index = 0; index < operators.length; ++index) {
                if (index && delay) await sleep(delay)
                const user_id=operators[index]
                const bot = plugin.app.bots.find(bot => bot.status===OnlineStatus.Online)
                await bot.sendPrivateMsg(user_id, message,session)
                createReplyCallback(session,user_id)
            }
            return template('common.feedback-success')
        })
}
export function respondent(plugin: Plugin, respondents: Respondent[]) {
    plugin.middleware((session,next) => {
        if(session.event_name!=='message')return next()
        const message = session.cqCode.trim()
        for (const { match, reply } of respondents) {
            const capture = typeof match === 'string' ? message === match && [message] : message.match(match)
            if (capture) return typeof reply === 'string' ? reply : reply(...capture)
        }
        return ''
    })
}
export function basic(plugin: Plugin, config: BasicConfig = {feedback:[]}) {
    if(config.echo!==false)plugin.plugin(echo)
    if (config.send !== false) plugin.plugin(send)
    if (!(config.recall <= 0)) plugin.plugin(recall, config)
    function noTimeout(feedback:BasicConfig['feedback']){
        return typeof feedback==='number'||Array.isArray(feedback)
    }
    const operators = makeArray(noTimeout(config.feedback)?config.feedback:config.feedback['operator']).map(op=>Number(op))
    if (operators.length) plugin.plugin(feedback, {operators,timeout:noTimeout(config.feedback)?plugin.app.config.delay.prompt:config.feedback['timeout']})

    const respondents = makeArray(config.respondent).filter(Boolean)
    if (respondents.length) plugin.plugin(respondent, respondents)
}

export interface Config extends BasicConfig {
    name?:string
}
export function install(plugin:Plugin,config:Config){
    plugin.command('common','message')
        .desc('基础功能')
    plugin.command('common/segment','message')
        .desc('生成指定消息段内容')

    plugin.command('common/segment/face <id:integer>','message')
        .desc('发送一个表情')
        .action((_,id)=>segment.face(id))
    plugin.command('common/segment/image <file>','message')
        .desc('发送一个一张图片')
        .action((_,file)=>segment.image(file))
    plugin.command('common/segment/at <qq:integer>','message')
        .desc('发送at')
        .action((_,at)=>segment.at(at))
    plugin.command('common/segment/dice [id:integer]','message')
        .desc('发送摇骰子结果')
        .action((_,id)=>segment.dice(id))
    plugin.command('common/segment/rps [id:integer]','message')
        .desc('发送猜拳结果')
        .action((_,id)=>segment.rps(id))
    plugin.command('common/segment/poke','message')
        .desc('发送戳一戳【随机一中类型】')
        .action((_,qq)=>segment.poke(parseInt((Math.random()*7).toFixed(0))))
    plugin.plugin(basic,{...config,name:'basic'} as Config)
    plugin.plugin(callme)
    plugin.plugin(music)
}
