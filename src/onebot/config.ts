import * as fs from "fs"
import * as path from "path"

export interface OneBotConfig {
    use_http?: boolean,
    use_ws?: boolean,
    access_token?: string,
    secret?: string,
    post_timeout: number,
    post_message_format: "string" | "array"
    enable_cors?: boolean,
    event_filter: string,
    enable_heartbeat?: boolean,
    heartbeat_interval?: number,
    rate_limit_interval?: number,
    post_url?: string[],
    ws_reverse_url?: string[],
    ws_reverse_reconnect_interval?: number,
    use_cqhttp_notice?: boolean,
}

export const defaultOneBotConfig: OneBotConfig = {
    use_cqhttp_notice: true,
    use_http: true,
    use_ws: true,
    access_token: "",
    secret: "",
    post_timeout: 30,
    post_message_format: "array",
    enable_cors: true,
    event_filter: "",
    enable_heartbeat: true,
    heartbeat_interval: 15000,
    rate_limit_interval: 500,
    post_url: [],
    ws_reverse_url: [],
    ws_reverse_reconnect_interval: 3000,
}

export function createIfNotExists(filepath: string) {
    const dirname = path.dirname(filepath)
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true})
    }
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, JSON.stringify({
            general: defaultOneBotConfig,
            123456789: { }
        }, null, 4))
    }
}