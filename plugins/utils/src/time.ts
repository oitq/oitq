import moment from 'moment'
import {Plugin} from "oitq";
export const name='time'
export function install(ctx:Plugin){
    const p=ctx.command('utils/time [timeStr]','message')
        .desc('日期操作（默认当前）')
        .option('format','-f [format:test] 输出格式',{initial:'YYYY-MM-DD hh:mm:ss'})
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).format(options.format)
        })
    p.subcommand('time.year [timeStr]','message')
        .desc("输出指定日期的年（默认当前）")
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).year()+''
        })
    p.subcommand('time.month [timeStr]','message')
        .desc('输出指定日期的月（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).month()+1+''
        })
    p.subcommand('time.day [timeStr]','message')
        .desc('输出指定日期的日（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).date()+1+''
        })
    p.subcommand('time.days [timeStr]','message')
        .desc('输出指定日期所在月的天数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).daysInMonth()+''
        })
    p.subcommand('time.hour [timeStr]','message')
        .desc('输出指定日期的小时数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).hour()+''
        })
    p.subcommand('time.minute [timeStr]','message')
        .desc('输出指定日期的分钟数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).minute()+''
        })
    p.subcommand('time.second [timeStr]','message')
        .desc('输出指定日期的秒数（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).second()+''
        })
    p.subcommand('time.isLeap [timeStr]','message')
        .desc('输出指定日期是否闰年（默认当前）')
        .action(({options},timeStr)=>{
            return moment(timeStr?timeStr:undefined).isLeapYear().toString()+''
        })
}
