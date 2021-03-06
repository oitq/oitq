import {formatContext,isSaveEnv} from "./utils";
import {Schedule} from "./model";
import '@oitq/service-database'
import {Plugin, NSession, Session,Time} from "oitq";
export const name='schedule'
export const using=['database'] as const
export interface Config {
    minInterval?: number
}
export function install(ctx: Plugin, { minInterval }: Config={minInterval:60000}) {
    ctx.database.define('Schedule',Schedule)
    async function hasSchedule(id: number) {
        const data = await ctx.database.models.Schedule.findAll({where:{id}})
        return data.length
    }

    async function prepareSchedule({ id, interval, command, time, lastCall }: Schedule, session: NSession) {
        const now = Date.now()
        const date = time.valueOf()

        async function executeSchedule() {
            ctx.app.getLogger('schedule').debug('execute %d: %s', id, command)
            try{
                let result=await session.executeTemplate(command)
                if(result && typeof result!=='boolean')await session.sendMsg(result)
            }catch{
                let result=await ctx.app.execute(session,command)
                if(result && typeof result!=='boolean')await session.sendMsg(result)
            }
            if (!lastCall || !interval) return
            lastCall = new Date()
            await ctx.database.models.Schedule.update({ lastCall },{where:{id}})
        }

        if (!interval) {
            if (date < now) {
                ctx.database.models.Schedule.destroy({where:{id}})
                if (lastCall) executeSchedule()
                return
            }

            ctx.app.getLogger('schedule').debug('prepare %d: %s at %s', id, command, time)
            return setTimeout(async () => {
                if (!await hasSchedule(id)) return
                ctx.database.models.Schedule.destroy({where:{id}})
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
        const schedules = await ctx.database.models.Schedule.findAll({where:{
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
        .desc('????????????')
        .option('rest', '-- <command:text>  ??????????????????')
        .option('interval', '/ <interval:string>  ???????????????????????????')
        .option('list', '-l  ???????????????????????????')
        .option('ensure', '-e  ???????????????????????????')
        .option('full', '-f  ?????????????????????')
        .option('delete', '-d <id>  ???????????????????????????')
        .action(async ({ session, options }, ...dateSegments) => {
            if (options.delete) {
                await ctx.database.models.Schedule.destroy({where:{id:options.delete}})
                return `?????? ${options.delete} ????????????`
            }

            if (options.list) {
                let schedules = (await ctx.database.models.Schedule.findAll({where:{assignee: [session.bot.uin]}})).map(t=>t.toJSON())
                if (!options.full) {
                    // @ts-ignore
                    schedules = schedules.filter(s => isSaveEnv(s.session,session))
                }
                if (!schedules.length) return '????????????????????????????????????'
                return schedules.map(({ id, time, interval, command, session }) => {
                    let output = `${id}. ${Time.formatTimeInterval(time, interval)}???${command}`
                    if (options.full) output += `???????????????${formatContext(session)}`
                    return output
                }).join('\n')
            }

            if (!options.rest) return '??????????????????????????????'

            const dateString = dateSegments.join('-')
            const time = Time.parseDate(dateString)
            const timestamp = +time
            if (Number.isNaN(timestamp) || timestamp > 2147483647000) {
                if (/^\d+$/.test(dateString)) {
                    return `??????????????????????????????????????????????????? ${dateString}s???`
                } else {
                    return '???????????????????????????'
                }
            } else if (!options.interval) {
                if (!dateString) {
                    return '????????????????????????'
                } else if (timestamp <= Date.now()) {
                    return '?????????????????????????????????????????????'
                }
            }

            const interval = Time.parseTime(options.interval)
            if (!interval && options.interval) {
                return '?????????????????????????????????'
            } else if (interval && interval < minInterval) {
                return '?????????????????????'
            }

            const schedule = await ctx.database.models.Schedule.create({
                time,
                assignee: session.bot.uin,
                interval,
                command: options.rest,
                session: session.toJSON('group_name'),
            })
            prepareSchedule(schedule.toJSON(), session as any)
            return `??????????????????????????? ${schedule.toJSON().id}???`
        })
}
