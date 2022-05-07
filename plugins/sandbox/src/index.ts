import {Context} from "oitq";
import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess,fork} from 'child_process'
import {Client} from "oicq";
import {Dispose, NSession} from "oitq/lib";
const bots:Map<string, Client> = new Map()
let worker:ChildProcess
let flag = false
function startWorker() {
    if (!flag)
        return
    worker = fork(path.join(__dirname, "worker"))
    worker.on("error", (err) => {
        fs.appendFile("err.log", Date() + " " + err.stack + "\n", ()=>{})
    })
    worker.on("exit", () => {
        startWorker()
    })
    worker.on("message", async (v) => {
        const value=v as any
        const bot:Client = bots.get(value?.uin)
        if (!bot)
            return
        let ret = await bot[value?.method]?.apply(bot, value?.params)
        if (ret instanceof Map)
            ret = Array.from(ret)
        if(!ret) ret={}
        ret.echo = value?.echo
        worker.send({
            data: ret,
            echo: value?.echo
        })
    })
}

function listener(session:NSession<any>) {
    worker.send(session.toJSON())
}

export const name='sandbox';
export function install(ctx:Context){
    ctx.command('sandbox','沙盒环境')
        .alias('沙箱')
        .option('start','-s 启动沙箱')
        .option('restart','-r 重启沙箱')
        .option('stop','-e 停止沙箱')
        .shortcut(/^启动(沙箱|sandbox)$/,{options:{start:true}})
        .shortcut(/^重启(沙箱|sandbox)$/,{options:{restart:true}})
        .shortcut(/^停止(沙箱|sandbox)$/,{options:{stop:true}})
        .action(({session,options})=>{
            if(options.start && options.restart){
                return 'start 和 restart 不能同时使用'
            }
            if(options.start && options.stop){
                return 'start 和 stop 不能同时使用'
            }
            if(options.restart && options.stop){
                return 'restart 和 stop 不能同时使用'
            }
            if(options.start && flag && worker){
                return '沙箱已启动，无需重复启动'
            }
            if(options.stop && !flag){
                return '沙箱已停止运行，无需重复停止运行'
            }
            if(options.start){
                flag=true
                startWorker()
                startListen()
                return '沙箱已启动'
            }
            if(options.stop){
                stopListen()
                flag=false;
                worker?.kill()
                return '沙箱已停止运行'
            }
            if(options.restart){
                worker?.kill()
                return '沙箱正在重启'
            }
        })
    function sessionListener (session){
        if(!bots.get(session.self_id)){
            bots.set(session.self_id,session.bot)
        }
        listener.bind(session.bot)(session)
    }
    const disposeArr:Dispose[]=[]
    function startListen(){
        disposeArr.push(
            ctx.on('bot.message',sessionListener),
            ctx.on('bot.request',sessionListener),
            ctx.on('bot.notice',sessionListener)
        )
    }
    function stopListen(){
        while (disposeArr.length){
            disposeArr.shift()()
        }
    }
    ctx.on('dispose',()=>{
        flag = false
        worker?.kill()
        ctx.dispose()
    })
}
