import {Client,Config} from 'oicq'
export type LoginType='qrcode'|'password'
export interface BotOptions{
    uin:number
    config:Config,
    type:LoginType
    password?:string
    access_token?:string
    secret?:string
    enable_heartbeat?:boolean
    heartbeat_interval?:number
    use_ws?:boolean
}
export class Bot extends Client{
    constructor(private options:BotOptions) {
        super(options.uin,options.config);
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