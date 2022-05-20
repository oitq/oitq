import stringify from 'string.ify'
import {NSession} from "oitq/lib";
import {fromCqcode} from "@oitq/utils";
import {Sandbox} from "./sandbox";
const stringify_config = stringify.configure({
    pure:            true,
    json:            true,
    maxDepth:        2,
    maxLength:       10,
    maxArrayLength:  20,
    maxObjectLength: 20,
    maxStringLength: 30,
    precision:       undefined,
    formatter:       undefined,
    pretty:          true,
    rightAlignKeys:  true,
    fancy:           false,
    indentation:     ' ',
})
const sandbox = new Sandbox(1659488338)

process.on("disconnect", process.exit)
process.on("message", async (value:Record<string, any>) => {
    if (!value.echo) {
        onmessage(value as NSession<any>)
    } else {
        handler.get(value.echo)?.(value)
        handler.delete(value.echo)
    }
})
const handler = new Map
async function callApi(method, params = [], check = true):Promise<Record<string, any>> {
    if (check)
        precheck(()=>{})
    const echo = String(Math.random()) + String(Date.now())
    process.send({
        uin: getSid(),
        method, params, echo
    })
    return new Promise((resolve) => handler.set(echo, resolve))
}
const bots = new Map
async function init(data, gid?) {
    if (!bots.has(data.self_id))
        bots.set(data.self_id, {})
    const bot = bots.get(data.self_id)
    if (!bot.groups) {
        sandbox.setEnv(data)
        bot.groups = (await callApi("getGroupList", [], false)).data
        bot.groups = new Map(bot.groups)
    }
    if (!gid) {
        for (const [gid, ginfo] of bot.groups) {
            sandbox.setEnv(data)
            let members = (await callApi("getGroupMemberList", [gid], false)).data
            if (!members) continue
            members = new Map(members)
            ginfo.members = {}
            for (const [uid, minfo] of members) {
                ginfo.members[uid] = minfo
                Object.freeze(minfo)
            }
            Object.freeze(ginfo.members)
            Object.freeze(ginfo)
        }
    } else {
        sandbox.setEnv(data)
        const ginfo = (await callApi("getGroupInfo", [gid], false)).data
        sandbox.setEnv(data)
        let members = (await callApi("getGroupMemberList", [gid], false)).data
        if (!ginfo || !members) return
        members = new Map(members)
        ginfo.members = {}
        for (const [uid, minfo] of members) {
            ginfo.members[uid] = minfo
            Object.freeze(minfo)
        }
        Object.freeze(ginfo.members)
        Object.freeze(ginfo)
        bot.groups.set(gid, ginfo)
    }
}

const getGid = ()=>sandbox.getContext().data.group_id
const getSid = ()=>sandbox.getContext().data.self_id

const async_queue = {}
const checkAndAddAsyncQueue = (o)=>{
    const key = getSid() + getGid() + sandbox.getContext().data.user_id
    if (!async_queue.hasOwnProperty(key)) {
        async_queue[key] = new Map()
        async_queue[key].set("start_moment", 0)
    }
    let endless_flag = false
    let start_moment = async_queue[key].get("start_moment")
    async_queue[key].forEach((v, k, map)=>{
        if (k === "start_moment")
            return
        if (v.end_time && Date.now() - v.end_time > 500)
            map.delete(k)
        else {
            endless_flag = true
            if (start_moment === 0)
                async_queue[key].set("start_moment", Date.now())
        }
    })
    if (!endless_flag)
        async_queue[key].set("start_moment", 0)
    if (async_queue[key].get("start_moment") > 0 && Date.now() - async_queue[key].get("start_moment") > 60000) {
        async_queue[key].set("start_moment", 0)
        throw new Error("判定为递归调用，中断。")
    }
    async_queue[key].set(o, {start_time: Date.now(), end_time: undefined})
}

const asyncCallback = (o, env, callback, argv = [])=>{
    const key = env.self_id + env.group_id + env.user_id
    async_queue[key].get(o).end_time = Date.now()
    sandbox.setEnv(env)
    const function_name = "tmp_" + Date.now()
    const argv_name = "tmp_argv_" + Date.now()
    sandbox.getContext()[function_name] = callback
    sandbox.getContext()[argv_name] = argv
    try {
        sandbox.exec(`this.${function_name}.apply(null, this.${argv_name})`)
    } catch (e) {}
    sandbox.exec(`delete this.${function_name};delete this.${argv_name}`)
}

const buckets = {}
const checkFrequency = ()=>{
    let uid = sandbox.getContext().data.user_id
    if (!uid)
        return
    if (buckets.hasOwnProperty(uid) && Date.now() - buckets[uid].time > 300)
        delete buckets[uid]
    if (!buckets.hasOwnProperty(uid))
        buckets[uid] = {time: 0, cnt: 0}
    if (buckets[uid].cnt >= 3)
        throw new Error("调用频率太快。")
    buckets[uid].time = Date.now()
    ++buckets[uid].cnt
}

const precheck = function(caller) {
    checkFrequency()
    let function_name = "current_called_api_"+Date.now()
    sandbox.getContext()[function_name] = caller
    sandbox.exec(`if (typeof this.beforeApiCalled === "function") {
    this.beforeApiCalled(this.${function_name})
    delete this.${function_name}
}`)
}

sandbox.include("setTimeout", function(fn, timeout = 5000, argv = []) {
    checkFrequency()
    checkAndAddAsyncQueue(this)
    if (typeof fn !== "function")
        throw new TypeError("fn(第一个参数)必须是函数。")
    timeout = +timeout
    if (isNaN(timeout) || timeout < 5000)
        throw new Error("延迟时间不能小于5000毫秒。")
    const env = sandbox.getContext().data
    const cb = ()=>asyncCallback(this, env, fn, argv)
    return setTimeout(cb, timeout)
})
sandbox.include("clearTimeout", clearTimeout)


//master可以执行任意代码
sandbox.include("run", (code)=>{
    if (sandbox.getContext().isMaster()) {
        try {
            return eval(code)
        } catch(e) {
            return e.stack
        }
    } else
        throw new Error("403 forbidden")
})

//导入一些工具模块

// 色情敏感词过滤
const ero = /(母狗|看批|日批|香批|批里|成人|无码|苍井空|b里|嫩b|嫩比|小便|大便|粪|屎|尿|淦|屄|屌|奸|淫|穴|肏|肛|骚|逼|妓|艹|子宫|月经|危险期|安全期|戴套|无套|内射|中出|射在里|射在外|精子|卵子|受精|幼女|嫩幼|粉嫩|日我|日烂|草我|草烂|干我|日死|草死|干死|狂草|狂干|狂插|狂操|日比|草比|搞我|舔我|舔阴|浪女|浪货|浪逼|浪妇|发浪|浪叫|淫荡|淫乱|荡妇|荡女|荡货|操烂|抽插|被干|被草|被操|被日|被上|被艹|被插|被射|射爆|射了|颜射|射脸|按摩棒|肉穴|小穴|阴核|阴户|阴阜|阴蒂|阴囊|阴部|阴道|阴唇|阴茎|肉棒|阳具|龟头|勃起|爱液|蜜液|精液|食精|咽精|吃精|吸精|吞精|喷精|射精|遗精|梦遗|深喉|人兽|兽交|滥交|拳交|乱交|群交|肛交|足交|脚交|口爆|口活|口交|乳交|乳房|乳头|乳沟|巨乳|玉乳|豪乳|暴乳|爆乳|乳爆|乳首|乳罩|奶子|奶罩|摸奶|胸罩|摸胸|胸部|胸推|推油|大保健|黄片|爽片|a片|野战|叫床|露出|露b|漏出|漏b|乱伦|轮奸|轮暴|轮操|强奸|强暴|情色|色情|全裸|裸体|果体|酥痒|捏弄|套弄|体位|骑乘|后入|二穴|三穴|嬲|调教|凌辱|饥渴|好想要|性交|性奴|性虐|性欲|性行为|性爱|做爱|作爱|手淫|撸管|自慰|痴女|鸡8|鸡ba|鸡鸡|鸡巴|鸡吧|鸡儿|肉便器|泄欲|发泄|高潮|潮吹|潮喷|爽死|爽翻|爽爆|你妈|屁眼|后庭|菊花|援交|操死|插死)/ig
function filter(msg) {
    if (typeof msg === "undefined")
        return
    else if (typeof msg !== "string")
        msg = stringify_config(msg).replace(/"/g,'')
    msg = msg.replace(ero, "⃺")
    if (!msg.length)
        return
    return msg
}

// qq api
const $:Record<string, any> = {
    getGroupInfo:()=>{
        return bots.get(getSid())?.groups?.get(getGid())
    },
    sendPrivateMsg : (uid, msg, escape_flag = false)=>{
        msg = filter(msg)
        if (!msg) return
        callApi("sendPrivateMsg", [uid, fromCqcode(msg)])
    },
    sendGroupMsg : (gid, msg, escape_flag = false)=>{
        msg = filter(msg)
        if (!msg) return
        callApi("sendGroupMsg", [gid, fromCqcode(msg)])
    },
    sendDiscussMsg : (id, msg, escape_flag = false)=>{
        msg = filter(msg)
        if (!msg) return
        callApi("sendDiscussMsg", [id, fromCqcode(msg)])
    },
    deleteMsg : (message_id)=>{
        callApi("deleteMsg", [message_id])
    },
    setGroupKick : (uid, forever = false)=>{
        callApi("setGroupKick", [getGid(), uid, forever])
    },
    setGroupBan : (uid, duration = 60)=>{
        callApi("setGroupBan", [getGid(), uid, duration])
    },
    setGroupAnonymousBan : (flag, duration = 60)=>{
        callApi("setGroupAnonymousBan", [getGid(), flag, duration])
    },
    setGroupAdmin : (uid, enable = true)=>{
        callApi("setGroupAdmin", [getGid(), uid, enable])
    },
    setGroupWholeBan : (enable = true)=>{
        callApi("setGroupWholeBan", [getGid(), enable])
    },
    setGroupAnonymous : (enable = true)=>{
        callApi("setGroupAnonymous", [getGid(), enable])
    },
    setGroupCard : (uid, card)=>{
        callApi("setGroupCard", [getGid(), uid, card])
    },
    setGroupLeave : (dismiss = false)=>{
        callApi("setGroupLeave", [getGid(), dismiss])
    },
    setGroupSpecialTitle : (uid, title, duration = -1)=>{
        callApi("setGroupSpecialTitle", [getGid(), uid, title, duration])
    },
    sendGroupNotice : (content)=>{
        callApi("sendGroupNotice", [getGid(), content])
    },
    sendGroupPoke : (uid)=>{
        callApi("sendGroupPoke", [getGid(), uid])
    },
    setGroupRequest : (flag, approve = true, reason = undefined)=>{
        callApi("setGroupAddRequest", [flag, approve, reason])
    },
    setFriendRequest : (flag, approve = true, remark = undefined)=>{
        callApi("setFriendAddRequest", [flag, approve, remark])
    },
    setGroupInvitation : (flag, approve = true, reason = undefined)=>{
        callApi("setGroupAddRequest", [flag, approve, reason])
    },
    inviteFriend : (gid, uid)=>{
        callApi("inviteFriend", [gid, uid])
    }
}
sandbox.include("$", $)
async function onmessage(session:NSession<any>) {
    if (session.post_type === "message") {
        if (session.message_type === "group" && bots.has(session.user_id) && session.user_id !== session.self_id && session.user_id < session.self_id) {
            return callApi("setGroupLeave", [session.group_id], false)
        }
        sandbox.setEnv(session)
        let res = await sandbox.run(session.cqCode)
        let echo = true
        if (session.cqCode.match(/^'\[CQ:at,qq=\d+\]'$/) && session.message_type==='private')
            echo = false
        if (res === null && session.cqCode === "null")
            echo = false
        if (["number", "boolean"].includes(typeof res) && res.toString() === session.cqCode)
            echo = false
        if (session.cqCode.substr(0,1) === "\\" && typeof res === "undefined")
            res = "<undefined>"
        res = filter(res)
        if (echo && res) {
            res = fromCqcode(res)
            if (session.message_type === "private")
                callApi("sendPrivateMsg", [session.user_id, res], false)
            else if (session.message_type === "group")
                callApi("sendGroupMsg", [session.group_id, res], false)
            else if (session.message_type === "discuss")
                callApi("sendDiscussMsg", [session.discuss_id, res], false)
        }
    } else {
        sandbox.setEnv(session)
    }
    if (!bots.has(session.self_id))
        init(session)
    else if (session.post_type === "notice" && session.notice_type === "group")
        init(session, session.group_id)
    try {
        sandbox.exec(`try{this.onEvents()}catch(e){}`)
    } catch { }
}
//防止沙盒逃逸
// @ts-ignore
Function.prototype.view = Function.prototype.toString
Function.prototype.constructor = new Proxy(Function, {
    apply: ()=>{
        throw Error("想跟妾身斗，汝还差得远呢。")
    },
    construct: ()=>{
        throw Error("想跟妾身斗，汝还差得远呢。")
    }
})
Object.freeze(Object)
Object.freeze(Object.prototype)
Object.freeze(Function)
Object.freeze(Function.prototype)
