import {App} from "./app";
import {ChannelId, Dict, Filter, NSession} from "./types";
import {Bot} from "./bot";
import {Argv} from "./argv";
import {Adapter, BotEventMap} from "./adapter";

export class Session{
    message_type?:string
    cqCode?:string
    user_id?:number
    group_id?:number
    discuss_id?:number
    constructor(public app:App,public adapter:Adapter,public bot:Bot,public event:string,args:any[]) {
        const obj:Dict=(args[0] && typeof args[0]==='object')?args.shift():{}
        obj.args=args
        Object.assign(this,obj)
    }
    async waitMessage(filter:Filter){

    }
    get channelId(){
        return [this.message_type,this.group_id,this.discuss_id,this.user_id]
            .filter(Boolean)
            .filter((_,i)=>i<2)
            .join(':') as ChannelId
    }
    async execute(argv:Argv|string=this.cqCode):Promise<string|boolean|void>{
        if(typeof argv==='string')argv=Argv.parse(argv)
        argv.bot = this.bot
        argv.session = this as any
        const command=this.app.findCommand(argv)
        if(command){
            let result
            if (result) return result
            try{
                result = await command.execute(argv)
            }catch (e){
                this.app.logger.warn(e.message)
            }
            if (result) return result
        }
    }
    async executeTemplate(template: string) {
        const session: NSession<BotEventMap,App.MessageEvent> = this as any
        template = template.replace(/\$A/g, `[CQ:at,qq=all]`)
            .replace(/\$a/g, `[CQ:at,qq=${session.user_id}]`)
            .replace(/\$m/g, `[CQ:at,qq=${session.bot.sid}]`)
            .replace(/\$s/g, () => session.sender['card'] || session.sender['title'] || session.sender.nickname)
        while (template.match(/\$\(.*\)/)) {
            const text = /\$\((.*)\)/.exec(template)[1]
            const executeResult = await this.executeTemplate(text)
            if (typeof executeResult === 'string'){
                template = template.replace(/\$\((.*)\)/, executeResult)
            }
        }
        const result=await this.execute(template)
        if(result && typeof result!=="boolean")return result
        return template
    }
    sendMsg(content:string,channel:ChannelId=this.channelId){
        return this.bot.sendMsg(channel,content)
    }
}
export namespace Session{

}
