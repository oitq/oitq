import {Plugin, NSession,MsgChannelId} from 'oitq'
import {Column, DataType, Model, Comment, Table} from "@oitq/plugin-database";
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
@Table
export class Rss extends Model {
    @Comment('属于哪个bot')
    @Column(DataType.INTEGER)
    bot_id: number
    @Comment('创建人')
    @Column(DataType.INTEGER)
    creator_id: number
    @Comment('订阅url')
    @Column(DataType.TEXT)
    url: string
    @Comment('订阅者类型')
    @Column(DataType.TEXT)
    target_type: string
    @Comment('订阅者id')
    @Column(DataType.INTEGER)
    target_id: number
    @Comment('订阅内容标题')
    @Column(DataType.TEXT)
    title:string
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
    ctx.app.database.addModels(Rss)
    const {timeout, refresh, userAgent} = config
    const feedMap: Record<string, Set<MsgChannelId>> = {}
    const feeder = new RssFeedEmitter({skipFirstLoad: true, userAgent})

    function subscribe(url: string, msgChannelId: MsgChannelId) {
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
    ctx.on('database.ready', async () => {
        const rssList = await Rss.findAll({raw: true})
        for (const rss of rssList) {
            subscribe(rss.url, `${rss.bot_id}-${rss.target_type}:${rss.target_id}` as MsgChannelId)
        }
    })
    const validators: Record<string, Promise<unknown>> = {}

    async function validate(url: string, session: NSession<'message'>) {
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
        const message = `${payload.meta.title} (${payload.author})\n${payload.title}\n${payload.link}`
        await ctx.app.broadcast([...feedMap[source]], message)
    })
    ctx.command('rss <title:string> <url:text>', 'message')
        .desc('订阅 RSS 链接')
        .option('list', '-l 查看订阅列表')
        .option('remove', '-r 取消订阅')
        .action(async ({session, options}, title,url) => {
            const target_id=session.group_id || session.discuss_id || session.user_id
            const msgChannelId=`${session.bot.uin}-${session.message_type}:${target_id}` as MsgChannelId
            const rssList = (await Rss.findAll({
                where: {
                    target_id,
                    bot_id:session.bot.uin,
                    target_type: session.message_type
                }
            })) as RssModel[]
            if (options.list) {
                if (!rssList.length) return '未订阅任何链接。'
                return rssList.map((rss,index)=>`${rss.title}:${rss.url}`).join('\n')
            }

            const index = rssList.findIndex(rss=>rss.url===url)

            if (options.remove) {
                if (index < 0) return '未订阅此链接。'
                if(session.sender.user_id!==rssList[index].creator_id && session.user.authority<5) return '权限不足'
                await Rss.destroy({
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
                subscribe(url, msgChannelId)
                await Rss.create({
                    url,
                    target_id,
                    title,
                    target_type:session.message_type,
                    bot_id:session.bot.uin,
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

