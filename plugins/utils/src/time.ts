import moment from 'moment'
import {Context} from "oitq";
export const name='time'
export function install(ctx:Context){
    ctx.command('utils/time [timeStr]','日期操作（默认当前）')
        .option('format','-f [format:test] 输出格式',{fallback:'YYYY-MM-DD hh:mm:ss'})
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).format(options.format)
        })
    ctx.command('utils/time.year [timeStr]','输出指定日期的年（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).year()+''
        })
    ctx.command('utils/time.month [timeStr]','输出指定日期的月（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).month()+1+''
        })
    ctx.command('utils/time.day [timeStr]','输出指定日期的日（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).day()+1+''
        })
    ctx.command('utils/time.days [timeStr]','输出指定日期所在月的天数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).daysInMonth()+''
        })
    ctx.command('utils/time.hour [timeStr]','输出指定日期的小时数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).hour()+''
        })
    ctx.command('utils/time.minute [timeStr]','输出指定日期的分钟数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).minute()+''
        })
    ctx.command('utils/time.second [timeStr]','输出指定日期的秒数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).second()+''
        })
    ctx.command('utils/time.isLeap [timeStr]','输出指定日期是否闰年（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).isLeapYear().toString()+''
        })
}
