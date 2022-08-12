import {Plugin,PluginMiddleware} from "oitq";

const print = new Plugin('print', __filename)
const printMiddleware:PluginMiddleware=((plugin)=>{
    plugin
        .command('print <msg:text>', 'all')
        .desc('打印一条消息')
        .action((_, msg) => {
            return msg+' 1111'
        })
})
print.using(['database'],printMiddleware)
