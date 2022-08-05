import {Client} from "oicq";

const besides=['constructor','online_status','log_level','bkn','stat','login','logout','em','emit']
export const APIS=Reflect.ownKeys(Client.prototype).filter(key=>typeof key==='string' && !besides.includes(key)&& !key.startsWith('_')
)
export const ARGS: { [key:string|symbol]:string[] }=Object.fromEntries(APIS.map(key=>{
    const str=String(Reflect.get(Client.prototype,key))
    return [key,str
        .match(/\(.*\)/)?.[0]
        .replace("(","")
        .replace(")","")
        .split(",")
        .filter(Boolean).map(v=>v.replace(/=.+/, "").trim())]
}))
export function toHump(action: string) {
    return action.replace(/_[\w]/g, (s)=>{
        return s[1].toUpperCase()
    })
}

export const BOOLS = ["no_cache", "auto_escape", "as_long", "enable", "reject_add_request", "is_dismiss", "approve", "block"]
export function toBool(v: any) {
    if (v === "0" || v === "false")
        v = false
    return Boolean(v)
}

export function genMetaEvent(uin: number, type: string) {
    return {
        self_id: uin,
        time: Math.floor(Date.now() / 1000),
        post_type: "meta_event",
        meta_event_type: "lifecycle",
        sub_type: type,
    }
}

export function transNotice(data: any) {
    if (data.sub_type === "poke") {
        data.notice_type = "notify"
        data.target_id = data.user_id
        data.user_id = data.operator_id
        data.operator_id = undefined
        return
    }
    if (data.notice_type === "friend") {
        if (data.sub_type === "increase")
            data.sub_type = undefined, data.notice_type = "friend_add"
        else if (data.sub_type === "recall")
            data.sub_type = undefined, data.notice_type = "friend_recall"
    } else if (data.notice_type === "group") {
        if (data.sub_type === "increase") {
            data.sub_type = undefined, data.notice_type = "group_increase"
        } else if (data.sub_type === "decrease") {
            data.notice_type = "group_decrease"
            if (data.operator_id === data.user_id)
                data.sub_type = "leave"
            else if (data.self_id === data.user_id)
                data.sub_type = "kick_me"
            else
                data.sub_type = "kick"
        } else if (data.sub_type === "recall") {
            data.sub_type = undefined, data.notice_type = "group_recall"
        } else if (data.sub_type === "ban") {
            data.notice_type = "group_ban"
            data.sub_type = data.duration ? "ban" : "lift_ban"
        } else if (data.sub_type === "admin") {
            data.notice_type = "group_admin"
            data.sub_type = data.set ? "set" : "unset"
        }
    }
}
