import {Client,Config} from 'oicq'
import {OneBotConfig} from "@/onebot/config";
import {OneBot} from "@/onebot";
export type LoginType='qrcode'|'password'
export interface BotOptions{
    uin:number
    config:Config,
    type:LoginType
    password?:string
    oneBot?:OneBotConfig|boolean
}
export class Bot extends Client{
    public oneBot:OneBot
    constructor(private options:BotOptions) {
        super(options.uin,options.config);
        const listener=(event)=>{
            this.oneBot?.dispatch(event)
        }
        this.on("message", listener)
        this.on("notice", listener)
        this.on("request", listener)
    }
}

export class BotList extends Array<Bot> {
    get(uin: number) {
        return this.find(bot => bot.uin === uin)
    }
    create(options: BotOptions) {
        const bot = new Bot(options)
        this.push(bot)
        return bot
    }
    async remove(uin: number) {
        const index = this.findIndex(bot => bot.uin === uin)
        if (index < 0) return
        const [bot] = this.splice(index, 1)
        await bot.logout()
    }

}