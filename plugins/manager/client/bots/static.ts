export const baseOneBot={
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
export const defaultBotConfig={
    uin:0,
    admins:[],
    master:1659488338,
    oneBot:true,
    config:{}
}
