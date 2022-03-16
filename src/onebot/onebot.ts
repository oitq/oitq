import {Client, Message} from 'oicq'
import * as path from "path";
import * as fs from 'fs'
import http from "http"
import https from "https"
import { URL } from "url"
import {WebSocketServer,WebSocket}from "ws"
import * as querystring from "querystring"
import  * as rfdc from "rfdc"
import {App} from "@/app";
import {Bot} from "@/bot";
import { assert } from "./filter"
import { toHump, transNotice, APIS, ARGS, toBool, BOOLS, genMetaEvent } from "./static"
import { OneBotConfig, defaultOneBotConfig, createIfNotExists } from "./config"
import {getAppConfigPath} from "@/utils";
import {dir} from "@/bin";
interface OneBotProtocol {
    action: string,
    params: any
    echo?: any
}

const clone = rfdc()
interface GlobalConfig {
    general: OneBotConfig,
    [k: number]: OneBotConfig
}

class NotFoundError extends Error { }
export class OneBot{
    protected heartbeat?: NodeJS.Timeout
    protected _queue: Array<{
        method: keyof Client,
        args: any[]
    }> = []
    protected wss?:WebSocketServer //ws服务器
    protected wsr = new Set<WebSocket>() //反向ws连接
    protected queue_running = false
    protected filter: any
    protected timestamp = Date.now()
    constructor(private app:App,protected bot:Bot,protected config:OneBotConfig=defaultOneBotConfig,private port=app.options.port) {
    }
    /**
     * 上报事件
     */
    protected _dispatch(unserialized: any) {
        const serialized = JSON.stringify(unserialized)
        for (const ws of this.wsr) {
            ws.send(serialized)
        }
        if (this.wss) {
            for (const ws of this.wss.clients) {
                ws.send(serialized, (err) => {
                    if (err)
                        this.bot.logger.error(`OneBot - 正向WS(${ws.url})上报事件失败: ` + err.message)
                    else
                        this.bot.logger.debug(`OneBot - 正向WS(${ws.url})上报事件成功: ` + serialized)
                })
            }
        }
        if (!(this.config.post_url?.length > 0))
            return
        const options: http.RequestOptions = {
            method: "POST",
            timeout: this.config.post_timeout * 1000,
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(serialized),
                "X-Self-ID": String(this.bot.uin),
                "User-Agent": "OneBot",
            }
        }
        if (this.config.secret) {
            //@ts-ignore
            options.headers["X-Signature"] = "sha1=" + crypto.createHmac("sha1", String(this.config.secret)).update(serialized).digest("hex")
        }
        for (const url of this.config.post_url) {
            const protocol = url.startsWith("https") ? https: http
            try {
                protocol.request(url, options, (res) => {
                    if (res.statusCode !== 200)
                        return this.bot.logger.warn(`OneBot - POST(${url})上报事件收到非200响应：` + res.statusCode)
                    let data = ""
                    res.setEncoding("utf-8")
                    res.on("data", (chunk) => data += chunk)
                    res.on("end", () => {
                        this.bot.logger.debug(`OneBot - 收到HTTP响应 ${res.statusCode} ：` + data)
                        if (!data)
                            return
                        try {
                            this._quickOperate(unserialized, JSON.parse(data))
                        } catch (e) {
                            this.bot.logger.error(`OneBot - 快速操作遇到错误：` + e.message)
                        }
                    })
                }).on("error", (err) => {
                    this.bot.logger.error(`OneBot - POST(${url})上报事件失败：` + err.message)
                }).end(serialized, () => {
                    this.bot.logger.debug(`OneBot - POST(${url})上报事件成功: ` + serialized)
                })
            } catch (e) {
                this.bot.logger.error(`OneBot - POST(${url})上报失败：` + e.message)
            }
        }
    }

    /**
     * 上报业务事件
     */
    dispatch(data: any) {
        let unserialized: any = data
        switch (data.post_type) {
            case "message":
                if (this.config.post_message_format === "string") {
                    unserialized = clone(unserialized)
                    unserialized.message = <Message>data.toCqcode()
                }
                break
            case "notice":
                if (this.config.use_cqhttp_notice) {
                    unserialized = clone(unserialized)
                    transNotice(unserialized)
                }
                break
        }
        if (!assert(this.filter, unserialized))
            return
        this._dispatch(unserialized)
    }

    /**
     * 处理http请求
     */
    protected async _httpRequestHandler(ctx) {
        if (ctx.method === 'OPTIONS' && this.config.enable_cors) {
            return ctx.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, authorization'
            }).end()
        }
        const url = new URL(ctx.url as string, `http://127.0.0.1`)
        if (this.config.access_token) {
            if (ctx.headers["authorization"]) {
                if (!ctx.headers["authorization"].includes(this.config.access_token))
                    return ctx.writeHead(403).end()
            } else {
                const access_token = url.searchParams.get("access_token")
                if (!access_token)
                    return ctx.writeHead(401).end()
                else if (!access_token.includes(this.config.access_token))
                    return ctx.writeHead(403).end()
            }
        }
        ctx.res.setHeader("Content-Type", "application/json; charset=utf-8")
        if (this.config.enable_cors)
            ctx.res.setHeader("Access-Control-Allow-Origin", "*")
        const action = url.pathname.replace(`/${this.bot.uin}`,'').slice(1)
        if (ctx.method === "GET") {
            this.bot.logger.debug(`OneBot - 收到GET请求: ` + ctx.url)
            const params = querystring.parse(url.search.slice(1))
            try {
                const ret = await this.apply({ action, params })
                ctx.res.end(ret)
            } catch (e) {
                ctx.res.writeHead(500).end(e.message)
            }
        } else if (ctx.method === "POST") {
            let data = ""
            ctx.req.setEncoding("utf-8")
            ctx.req.on("data", (chunk) => data += chunk)
            ctx.req.on("end", async () => {
                try {
                    this.bot.logger.debug(`OneBot - 收到POST请求: ` + data)
                    let params, ct = ctx.req.headers["content-type"]
                    if (!ct || ct.includes("json"))
                        params = data ? JSON.parse(data) : {}
                    else if (ct && ct.includes("x-www-form-urlencoded"))
                        params = querystring.parse(data)
                    else
                        return ctx.res.writeHead(406).end()
                    const ret = await this.apply({ action, params })
                    ctx.res.end(ret)
                } catch (e) {
                    if (e instanceof NotFoundError)
                        ctx.res.writeHead(404).end(e.message)
                    else
                        ctx.res.writeHead(400).end(e.message)
                }
            })
        } else {
            ctx.res.writeHead(405).end()
        }
    }

    /**
     * 处理ws消息
     */
    protected _webSocketHandler(ws: WebSocket) {
        ws.on("message", async (msg) => {
            this.bot.logger.debug("插件OneBot - 收到ws消息：" + msg)
            var data
            try {
                data = JSON.parse(String(msg)) as OneBotProtocol
                let ret: string
                if (data.action.startsWith(".handle_quick_operation")) {
                    const event = data.params.context, res = data.params.operation
                    this._quickOperate(event, res)
                    ret = JSON.stringify({
                        retcode: 1,
                        status: "async",
                        data: null,
                        error: null,
                        echo: data.echo
                    })
                } else {
                    ret = await this.apply(data)
                }
                ws.send(ret)
            } catch (e) {
                let code: number, message: string
                if (e instanceof NotFoundError) {
                    code = 1404
                    message = "不支持的api"
                } else {
                    code = 1400
                    message = "请求格式错误"
                }
                ws.send(JSON.stringify({
                    retcode: code,
                    status: "failed",
                    data: null,
                    error: {
                        code, message
                    },
                    echo: data?.echo
                }))
            }
        })
        ws.send(JSON.stringify(genMetaEvent(this.bot.uin, "connect")))
        ws.send(JSON.stringify(genMetaEvent(this.bot.uin, "enable")))
    }
    /**
     * 调用api
     */
    protected async apply(req: OneBotProtocol) {
        let { action, params, echo } = req
        let is_async = action.includes("_async")
        if (is_async)
            action = action.replace("_async", "")
        let is_queue = action.includes("_rate_limited")
        if (is_queue)
            action = action.replace("_rate_limited", "")
        if (action === "send_msg") {
            if (["private", "group", "discuss"].includes(params.message_type)){
                action = "send_" + params.message_type + "_msg"
            }else if (params.user_id)
                action = "send_private_msg"
            else if (params.group_id)
                action = "send_group_msg"
            else if (params.discuss_id)
                action = "send_discuss_msg"
            else throw new Error('required message_type or input (user_id/group_id)')
        }

        if (action === "set_restart") {
            this.stop().then(this.start.bind(this))
            const ret: any = {
                retcode: 1,
                status: "async",
                data: null,
                error: null
            }
            if (echo) {
                ret.echo = echo
            }
            return JSON.stringify(ret)
        }

        const method = toHump(action) as keyof Client
        if (APIS.includes(method)) {

            const args = []
            for (let k of ARGS[method]) {
                if (Reflect.has(params, k)) {
                    if (BOOLS.includes(k))
                        params[k] = toBool(params[k])
                    args.push(params[k])
                }
            }

            let ret: any,result:any
            if (is_queue) {
                this._queue.push({ method, args })
                this._runQueue()
                result = {
                    retcode: 1,
                    status: "async",
                    data: null,
                    error: null
                }
            } else {
                ret = (this.bot[method] as Function).apply(this.bot, args)
                if (ret instanceof Promise) {
                    if (is_async)
                        result = {
                            retcode: 1,
                            status: "async",
                            data: null,
                            error: null
                        }
                    else
                        ret = await ret
                }
            }
            if (ret instanceof Map)
                ret = [...ret.values()]

            if (echo) {
                //@ts-ignore
                result.echo = echo
            }
            return JSON.stringify({...result,data:ret})
        } else {
            throw new NotFoundError()
        }
    }

    /**
     * 快速操作
     */
    protected _quickOperate(event:any, res: any) {
        if (event.post_type === "message") {
            if (res.reply) {
                if (event.message_type === "discuss")
                    return
                const action = event.message_type === "private" ? "sendPrivateMsg" : "sendGroupMsg"
                const id = event.message_type === "private" ? event.user_id : event.group_id
                this.bot[action](id, res.reply, res.auto_escape)
            }
            if (event.message_type === "group") {
                if (res.delete)
                    this.bot.deleteMsg(event.message_id)
                if (res.kick && !event.anonymous)
                    this.bot.setGroupKick(event.group_id, event.user_id, res.reject_add_request)
                if (res.ban)
                    this.bot.setGroupBan(event.group_id, event.user_id, res.ban_duration > 0 ? res.ban_duration : 1800)
            }
        }
        if (event.post_type === "request" && "approve" in res) {
            const action = event.request_type === "friend" ? "setFriendAddRequest" : "setGroupAddRequest"
            this.bot[action](event.flag, res.approve, res.reason ? res.reason : "", res.block ? true : false)
        }
    }

    /**
     * 限速队列调用
     */
    protected async _runQueue() {
        if (this.queue_running) return
        while (this._queue.length > 0) {
            this.queue_running = true
            const task = this._queue.shift()
            const {method, args} = task as typeof OneBot.prototype._queue[0]
            (this.bot[method] as Function).apply(this.bot, args)
            await new Promise((resolve)=>{
                setTimeout(resolve, this.config.rate_limit_interval)
            })
            this.queue_running = false
        }
    }
    /**
     * 创建反向ws
     */
    protected _createWsr(url: string) {
        const timestmap = Date.now()
        const headers: http.OutgoingHttpHeaders = {
            "X-Self-ID": String(this.bot.uin),
            "X-Client-Role": "Universal",
            "User-Agent": "OneBot",
        }
        if (this.config.access_token)
            headers.Authorization = "Bearer " + this.config.access_token
        const ws = new WebSocket(url, { headers })
        // @ts-ignore
        ws.on("error", (err) => {
            this.bot.logger.error(err.message)
        })
        // @ts-ignore
        ws.on("open", ()=>{
            this.bot.logger.info(`OneBot - 反向ws(${url})连接成功。`)
            this.wsr.add(ws)
            this._webSocketHandler(ws)
        })
        // @ts-ignore
        ws.on("close", (code) => {
            this.wsr.delete(ws)
            if (timestmap < this.timestamp)
                return
            this.bot.logger.warn(`OneBot - 反向ws(${url})被关闭，关闭码${code}，将在${this.config.ws_reverse_reconnect_interval}毫秒后尝试重连。`)
            setTimeout(() => {
                if (timestmap < this.timestamp)
                    return
                this._createWsr(url)
            }, this.config.ws_reverse_reconnect_interval)
        })
    }

    /**
     * 实例启动
     */
    async start() {
        this.config = Object.assign(this.config,await readConfig(this.bot.uin))
        for (const url of this.config.ws_reverse_url||[])
            this._createWsr(url)
        this._dispatch(genMetaEvent(this.bot.uin, "enable"))
        if (this.config.enable_heartbeat) {
            this.heartbeat = setInterval(()=>{
                this._dispatch({
                    self_id: this.bot.uin,
                    time: Math.floor(Date.now() / 1000),
                    post_type: "meta_event",
                    meta_event_type: "heartbeat",
                    interval: this.config.heartbeat_interval,
                })
            }, this.config.heartbeat_interval)
        }
        if (this.config.event_filter) {
            try {
                this.filter = JSON.parse(await fs.promises.readFile(this.config.event_filter, "utf-8"))
                this.bot.logger.info("OneBot - 事件过滤器加载成功。")
            } catch (e) {
                this.bot.logger.error(e.message)
                this.bot.logger.error("OneBot - 事件过滤器加载失败，将不会进行任何过滤。")
            }
        }
        if (!this.config.use_http && !this.config.use_ws)
            return
        if(this.config.use_http){
            this.bot.logger.info(`OneBot - 开启http服务器成功，监听:http://127.0.0.1:${this.port}/${this.bot.uin}`)
            this.app.router.all(new RegExp(`^/${this.bot.uin}/(.*)$`),this._httpRequestHandler.bind(this))
        }
        if (this.config.use_ws) {
            this.bot.logger.info(`OneBot - 开启ws服务器成功，监听:ws://127.0.0.1:${this.port}/${this.bot.uin}`)
            this.wss = this.app.router.ws(`/${this.bot.uin}`,this.app.httpServer)
            this.wss.on("error", (err) => {
                this.bot.logger.error(err.message)
            })
            this.wss.on("connection", (ws, req)=>{
                ws.on("error", (err) => {
                    this.bot.logger.error(err.message)
                })
                ws.on("close", (code, reason) => {
                    this.bot.logger.warn(`OneBot - 正向ws连接关闭，关闭码${code}，关闭理由：` + reason)
                })
                if (this.config.access_token) {
                    const url = new URL(req.url as string, "http://127.0.0.1")
                    const token = url.searchParams.get('access_token')
                    if (token)
                        req.headers["authorization"] = token
                    if (!req.headers["authorization"] || !req.headers["authorization"].includes(this.config.access_token))
                        return ws.close(1002, "wrong access token")
                }
                this._webSocketHandler(ws)
            })
        }
    }
    /**
     * 实例停止
     */
    async stop() {
        this.timestamp = Date.now()
        this._dispatch(genMetaEvent(this.bot.uin, "disable"))
        if (this.heartbeat) {
            clearInterval(this.heartbeat)
            this.heartbeat = undefined
        }
        for (const ws of this.wsr)
            ws.close()
        if (this.wss) {
            for (const ws of this.wss.clients)
                ws.close()
        }
    }
}
async function readConfig(uin: number) {
    const global_config = JSON.parse(await fs.promises.readFile(filepath, { encoding: "utf-8" })) as GlobalConfig
    return Object.assign({}, defaultOneBotConfig, global_config.general, global_config[uin])
}

const filepath = path.join(getAppConfigPath(dir))
createIfNotExists(filepath)
