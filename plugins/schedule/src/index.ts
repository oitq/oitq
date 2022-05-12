import {formatContext,isSaveEnv} from "./utils";
import {Schedule,ScheduleInfo} from "./model";
import '@oitq/plugin-database'
import {Plugin, NSession, Session,Time} from "oitq";
export const name='schedule'
export const using=['database'] as const
export interface Config {
    minInterval?: number
}
export function install(ctx: Plugin, { minInterval }: Config={minInterval:60000}) {
    ctx.app.database.addModels(Schedule)
    async function hasSchedule(id: number) {
        const data = await Schedule.findAll({where:{id}})
        return data.length
    }

    async function prepareSchedule({ id, interval, command, time, lastCall }: ScheduleInfo, session: NSession<'message'>) {
        const now = Date.now()
        const date = time.valueOf()

        async function executeSchedule() {
            ctx.app.getLogger('schedule').debug('execute %d: %s', id, command)
            try{
                session.bot.sendMsg(session.getChannelId(),await session.executeTemplate(command) as string)
            }catch{
                await ctx.execute(session,command)
            }
            if (!lastCall || !interval) return
            lastCall = new Date()
            await Schedule.update({ lastCall },{where:{id}})
        }

        if (!interval) {
            if (date < now) {
                Schedule.destroy({where:{id}})
                if (lastCall) executeSchedule()
                return
            }

            ctx.app.getLogger('schedule').debug('prepare %d: %s at %s', id, command, time)
            return setTimeout(async () => {
                if (!await hasSchedule(id)) return
                Schedule.destroy({where:{id}})
                executeSchedule()
            }, date - now)
        }

        ctx.app.getLogger('schedule').debug('prepare %d: %c from %s every %s', id, command, time, Time.formatTimeShort(interval))
        const timeout = date < now ? interval - (now - date) % interval : date - now
        if (lastCall && timeout + now - interval > +lastCall) {
            executeSchedule()
        }

        setTimeout(async () => {
            if (!await hasSchedule(id)) return
            const timer = setInterval(async () => {
                if (!await hasSchedule(id)) return clearInterval(timer)
                executeSchedule()
            }, interval)
            executeSchedule()
        }, timeout)
    }

    ctx.on('database.ready', async () => {
        const schedules = await Schedule.findAll({where:{
                assignee:ctx.app.bots.map(bot => bot.uin)
            }})
        schedules.forEach((s) => {
            const schedule=s.toJSON()
            const { session, assignee } = schedule
            const bot = ctx.app.bots.find((bot)=>bot.uin===assignee)
            if (!bot) return
            prepareSchedule(schedule, new Session(ctx.app, bot, session,session.event_name) as unknown as NSession<'message'>)
        })
    })

    ctx.command('schedule [time]', 'message')
        .desc('定时任务')
        .option('rest', '-- <command:text>  要执行的指令')
        .option('interval', '/ <interval:string>  设置触发的间隔秒数')
        .option('list', '-l  查看已经设置的日程')
        .option('ensure', '-e  错过时间也确保执行')
        .option('full', '-f  查找全部上下文')
        .option('delete', '-d <id>  删除已经设置的日程')
        .action(async ({ session, options }, ...dateSegments) => {
            if (options.delete) {
                await Schedule.destroy({where:{id:options.delete}})
                return `日程 ${options.delete} 已删除。`
            }

            if (options.list) {
                let schedules = (await Schedule.findAll({where:{assignee: [session.bot.uin]}})).map(t=>t.toJSON())
                if (!options.full) {
                    // @ts-ignore
                    schedules = schedules.filter(s => isSaveEnv(s.session,session))
                }
                if (!schedules.length) return '当前没有等待执行的日程。'
                return schedules.map(({ id, time, interval, command, session }) => {
                    let output = `${id}. ${Time.formatTimeInterval(time, interval)}：${command}`
                    if (options.full) output += `，上下文：${formatContext(session)}`
                    return output
                }).join('\n')
            }

            if (!options.rest) return '请输入要执行的指令。'

            const dateString = dateSegments.join('-')
            const time = Time.parseDate(dateString)
            const timestamp = +time
            if (Number.isNaN(timestamp) || timestamp > 2147483647000) {
                if (/^\d+$/.test(dateString)) {
                    return `请输入合法的日期。你要输入的是不是 ${dateString}s？`
                } else {
                    return '请输入合法的日期。'
                }
            } else if (!options.interval) {
                if (!dateString) {
                    return '请输入执行时间。'
                } else if (timestamp <= Date.now()) {
                    return '不能指定过去的时间为执行时间。'
                }
            }

            const interval = Time.parseTime(options.interval)
            if (!interval && options.interval) {
                return '请输入合法的时间间隔。'
            } else if (interval && interval < minInterval) {
                return '时间间隔过短。'
            }

            const schedule = await Schedule.create({
                time,
                assignee: session.bot.uin,
                interval,
                command: options.rest,
                session: session.toJSON('group_name'),
            })
            prepareSchedule(schedule.toJSON(), session as any)
            return `日程已创建，编号为 ${schedule.id}。`
        })
}
