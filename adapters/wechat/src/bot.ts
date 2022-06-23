import {Client, EventMap,Sendable,Config as ClientConfig,MessageRet} from "lib-wechat";
import {App,Adapter,Bot,ChannelId,Filter, NSession, Session,Plugin} from "oitq";
import {merge} from "@oitq/utils";
export class WechatBot extends Client implements Bot<WechatBot.Config>{
    options: WechatBot.Config
    admins:string[]=[]
    public platform: 'wechat';
    public plugin: Plugin;
    public sid: string;
    master:string
    public app:App
    constructor(public adapter:Adapter, config:WechatBot.Config) {
        super(config.wxid,merge(WechatBot,config).config);
        this.app=adapter.app
        config=merge(WechatBot.DefaultConfig,config)
        this.plugin=adapter.plugin
        this.sid=config.wxid
        this.options = config
        this.admins=config.admins||[]
        this.master=config.master||null
    }
    start(){
        this.login()
    }
    stop(){
        this.logout()
    }
    isMaster(user_id:string){
        return this.options.master===user_id
    }
    isAdmin(user_id:string){
        return this.options.admins.includes(user_id)
    }



    // 重写emit，将event data封装成session，上报到app
    emit<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>) {
        const session=this.createSession(name,...args)
        if(name==='message'){
            this.adapter.app.parallel('before-attach',session).finally(()=>{
                this.adapter.app.emit(`bot.${name}`,session)
            })
        }else {
            this.adapter.app.emit(`bot.${name}`,session)
        }
        this.adapter.app.emit(name,...args)
        return super.emit(name, ...args)
    }

    createSession<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>) {
        let data: any = typeof args[0] === "object" ? args.shift() : {}
        if (!data) data = {}
        data.args = args
        return new Session(this.app, this, data,name) as unknown as NSession<E>
    }
    waitMessage(filter:Filter,timout=this.app.config.delay.prompt):Promise<NSession|void>{
        return new Promise<NSession|void>((resolve => {
            const dispose=this.app.middleware(async (session)=>{
                if(session.event_name!=='message'|| !filter(session as NSession))return
                else{
                    dispose()
                    resolve(session as NSession)
                }
                setTimeout(()=>{
                    resolve(null)
                    dispose()
                },timout)
            })
        }))
    }

    /**
     * 获取登录信息
     */
    getLoginInfo(){
        return {
            user_id:this.info.wx_id,
            nickname:this.info.nick_name
        }
    }
    getCredentials(domain:string){
        return {
            cookies:'',
            csrf_token:''
        }
    }
    getStatus(){
        return {
            online:true,
            good:true
        }
    }
    /**
     * 发送消息
     * @param channelId 通道id
     * @param content 消息内容，如果为CQ码会自动转换
     */
    async sendMsg(channelId: string, content: Sendable): Promise<MessageRet> {
        const [type, id] = channelId.split(':')
        switch (type) {
            case 'group':
                if (!this.gl.get(id)) throw new Error(`我没有加入群:${id}`)
                return this.pickGroup(id).sendMsg(content)
            case 'private':
                if (!this.fl.get(id)) throw new Error(`我没有添加用户:${id}`)
                return this.pickFriend(id).sendMsg(content)
        }
        throw new Error('无效的通道Id')
    }
    async broadcast(channelIds:(ChannelId|string)[],message:Sendable){
        const result=[]
        for(const channelId of channelIds){
            if(typeof channelId==="number")result.push(await this.sendPrivateMsg(channelId,message))
            else result.push(await this.sendMsg(channelId,message))
        }
        return result
    }


}
export namespace WechatBot{
    export const DefaultConfig:Config={
        platform: 'wechat',
        admins:[],
        config:{
            data_dir:process.cwd()+'/data',
        }
    }
    export interface Config extends Bot.BaseConfig{
        platform:'wechat'
        wxid?: string
        config?: ClientConfig,
        master?: string // 当前机器人主人
        admins?: string[] // 当前机器人管理员
    }
}
