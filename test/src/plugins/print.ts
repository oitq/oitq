import {Plugin} from "oitq";

const print = new Plugin('print', __filename)
print.command('print <msg:text>', 'all')
    .desc('打印一条消息')
    .action((_, msg) => {
        return msg+' 1111'
    })
