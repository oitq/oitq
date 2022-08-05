import {Awaitable, ChannelId, Dict} from "./types";
import {App} from "./app";
import {Adapter} from "./adapter";

export interface Bot<O extends Bot.Options=Bot.Options>{
    app:App
    adapter:Adapter<Bot<O>>
    options:O
    sid:string
    sendMsg(channelId:ChannelId,message:string)
    start():Awaitable
    stop():Awaitable
    [key:string]:any
}
export namespace Bot{
    export interface Options extends Dict{}
}
