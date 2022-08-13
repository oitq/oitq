import {App} from "./app";
import {ChannelId, Dict, Filter, NSession} from "./types";
import {Bot} from "./bot";
import {Argv} from "./argv";
import {Adapter, BotEventMap} from "./adapter";
import {Prompt} from "./prompt";

export class Session{
    message_type?:string
    cqCode?:string
    user_id?:number
    group_id?:number
    discuss_id?:number
    constructor(public app:App,public adapter:Adapter,public bot:Bot,public event:string,args:any[]) {
        const obj:Dict=(args[0] && typeof args[0]==='object')?args.shift():{}
        obj.args=args
        Object.assign(this as unknown as ObjectConstructor,obj)
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

    private promptReal<T extends keyof Prompt.TypeKV>(prev: any, answer: Dict, options: Prompt.Options<T>): Promise<Prompt.ValueType<T> | void> {
        if (typeof options.type === 'function') options.type = options.type(prev, answer, options)
        if (!options.type) return
        if (['select', 'multipleSelect'].includes(options.type as keyof Prompt.TypeKV) && !options.choices) throw new Error('choices is required')
        return new Promise<Prompt.ValueType<T> | void>(resolve => {
            this.sendMsg(Prompt.formatOutput(prev, answer, options))
            const dispose = this.app.middleware((session) => {
                const cb = () => {
                    let result = Prompt.formatValue(prev, answer, options, session.cqCode)
                    dispose()
                    resolve(result)
                    clearTimeout(timer)
                }
                if (!options.validate) {
                    cb()
                } else {
                    if (typeof options.validate !== "function") {
                        options.validate = (str: string) => (options.validate as RegExp).test(str)
                    }
                    try {
                        let result = options.validate(session.cqCode)
                        if (result && typeof result === "boolean") cb()
                        else this.sendMsg(options.errorMsg)
                    } catch (e) {
                        this.sendMsg(e.message)
                    }
                }
            })
            const timer = setTimeout(() => {
                dispose()
                resolve()
            }, options.timeout || this.app.config.delay.prompt)
        })
    }

    async prompt<T extends keyof Prompt.TypeKV>(options: Prompt.Options<T> | Array<Prompt.Options<T>>) {
        options = [].concat(options)
        let answer: Dict = {}
        let prev: any = undefined
        try {
            if (options.length === 0) return
            for (const option of options) {
                if (typeof option.type === 'function') option.type = option.type(prev, answer, option)
                if (!option.type) continue
                if (!option.name) throw new Error('name is required')
                prev = await this.promptReal(prev, answer, option)
                answer[option.name] = prev
            }
        } catch (e) {
            this.sendMsg(e.message)
            return
        }
        return answer as Prompt.Answers<Prompt.ValueType<T>>
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
    toJSON(...ignoreKeys:string[]){
        return Object.fromEntries(Object.keys(this)
            .filter(key=>typeof this[key] !=="function" && !['adapter','bot','app'].includes(key))
            .map(key=>{
            return [key,this[key]]
        }))
    }
    sendMsg(content:string,channel:ChannelId=this.channelId){
        return this.bot.sendMsg(channel,content)
    }
}
