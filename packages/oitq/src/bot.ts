import {Awaitable, ChannelId, Dict} from "./types";
import {App} from "./app";
import {Adapter} from "./adapter";

export interface Bot<O extends Dict=Dict>{
    app:App
    adapter:Adapter<Bot>
    options:O
    sid:string
    sendMsg(channelId:ChannelId,message:string)
    start():Awaitable
    stop():Awaitable
    [key:string]:any
}
