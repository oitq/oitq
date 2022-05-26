import {Plugin, NSession,MsgChannelId} from 'oitq'
import {DataTypes,TableDecl} from "@oitq/plugin-database";
import RssFeedEmitter from 'rss-feed-emitter'

export const name = 'rss'
export const using = ['database'] as const

    export interface Config {
    timeout?: number
    refresh?: number
    userAgent?: string
}

export interface RssModel {
    bot_id: number
    title?:string
    creator_id: number
    url: string,
        target_type: string,
        target_id: number
}
export const Rss:TableDecl={
    bot_id:{
        type:DataTypes.DECIMAL,
        comment:'属于哪个bot'
    },
    creator_id:{
        type:DataTypes.DECIMAL,
        comment:'创建人'
    },
    url:{
        type:DataTypes.TEXT,
        comment:'订阅url'
    },
    target_type:{
        type:DataTypes.TEXT,
        comment:'订阅者类型'
    },
    target_id:{
        type:DataTypes.INTEGER,
        comment:'订阅者类型'
    },
    title:{
        type:DataTypes.TEXT,
        comment:'订阅内容标题'
    },
    callback:{
        type:DataTypes.TEXT,
        comment:'回调函数'
    }
}
export interface Config {
    timeout?: number
    refresh?: number
    userAgent?: string
}

export interface Config {
    timeout?: number
    refresh?: number
    userAgent?: string
}

export function install(ctx: Plugin, config: Config) {
    const logger = ctx.getLogger('rss')
    ctx.app.database.define('Rss',Rss)
    const {timeout, refresh, userAgent} = config
    const feedMap: Record<string, Set<MsgChannelId>> = {}
    const feeder = new RssFeedEmitter({skipFirstLoad: true, userAgent})
    const callbackMap:Record<string, Function>={}
    function subscribe(url: string, msgChannelId: MsgChannelId,callback?:Function) {
        if(callback){
            callbackMap[url]=callback
        }
        if (url in feedMap) {
            feedMap[url].add(msgChannelId)
        } else {
            feedMap[url] = new Set([msgChannelId])
            feeder.add({url, refresh})
            logger.debug('subscribe', url)
        }
    }

    function unsubscribe(url: string, msgChannelId: MsgChannelId) {
        feedMap[url].delete(msgChannelId)
        if (!feedMap[url].size) {
            delete feedMap[url]
            feeder.remove(url)
            logger.debug('unsubscribe', url)
        }
    }

    ctx.on('dispose', () => {
        feeder.destroy()
    })
    feeder.on('error', (err: Error) => {
        logger.debug(err.message)
    })
    ctx.app.on('database.ready', async () => {
        const rssList = await ctx.database.models.Rss.findAll()
        for (const rss of rssList) {
            const rssInfo=rss.toJSON()
            subscribe(rssInfo.url, `${rssInfo.bot_id}-${rssInfo.target_type}:${rssInfo.target_id}` as MsgChannelId,rssInfo.callback)
        }
    })
    const validators: Record<string, Promise<unknown>> = {}

    async function validate(url: string, session: NSession) {
        if (validators[url]) {
            await session.sendMsg('正在尝试连接……')
            return validators[url]
        }

        let timer: NodeJS.Timeout
        const feeder = new RssFeedEmitter({userAgent})
        return validators[url] = new Promise((resolve, reject) => {
            // rss-feed-emitter's typings suck
            feeder.add({url, refresh: 1 << 30})
            feeder.on('new-item', resolve)
            feeder.on('error', reject)
            timer = setTimeout(() => reject(new Error('connect timeout')), timeout)
        }).finally(() => {
            feeder.destroy()
            clearTimeout(timer)
            delete validators[url]
        })
    }

    feeder.on('new-item', async (payload) => {
        logger.debug('receive', payload.title)
        const source = payload.meta.link
        if (!feedMap[source]) return
        const message = callbackMap[source]?callbackMap[source].apply(payload):`${payload.meta.title} (${payload.author})\n${payload.title}\n${payload.link}`
        await ctx.app.broadcast([...feedMap[source]], message)
    })
    ctx.command('rss <title:string> <url:string>', 'message')
        .desc('订阅 RSS 链接')
        .option('list', '-l 查看订阅列表')
        .option('callback','-c <callback:function> 回调处理函数')
        .option('remove', '-r 取消订阅')
        .action(async ({session, options}, title,url) => {
            const target_id=session.group_id || session.discuss_id || session.user_id
            const msgChannelId=`${session.bot.uin}-${session.message_type}:${target_id}` as MsgChannelId
            const rssList = (await ctx.database.models.Rss.findAll({
                where: {
                    target_id,
                    bot_id:session.bot.uin,
                    target_type: session.message_type
                }
            })).map(item=>item.toJSON())
            if (options.list) {
                if (!rssList.length) return '未订阅任何链接。'
                return rssList.map((rss,index)=>`${rss.title}:${rss.url}`).join('\n')
            }

            const index = rssList.findIndex(rss=>rss.url===url)

            if (options.remove) {
                if (index < 0) return '未订阅此链接。'
                if(session.sender.user_id!==rssList[index].creator_id && session.user.authority<5) return '权限不足'
                await ctx.database.models.Rss.destroy({
                    where:{
                        url,
                        target_id,
                        target_type:session.message_type,
                        bot_id:session.bot.uin,
                    }
                })
                unsubscribe(url, msgChannelId)
                return '取消订阅成功！'
            }

            if (index >= 0) return '已订阅此链接。'
            return validate(url, session).then(async () => {
                subscribe(url, msgChannelId,options.callback)
                await ctx.database.models.Rss.create({
                    url,
                    target_id,
                    title,
                    target_type:session.message_type,
                    bot_id:session.bot.uin,
                    callback:options.callback||null,
                    creator_id:session.sender.user_id
                })
                return '添加订阅成功！'
            }, (error) => {
                logger.debug(error)
                console.log(error)
                return '无法订阅此链接。'
            })
        })
}

