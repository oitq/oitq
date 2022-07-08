import {EventMap} from "oicq";
import {Bot} from "./bot";

export interface PortMessage{
    name:string
    event:keyof EventMap
}
export interface Action<T extends Bot,K extends keyof T>{
    method:K
    params:T[K] extends (...args:any)=>any?Parameters<T[K]>:any[]
    echo?:string
}
export type Return<T extends Bot,K extends keyof T>=T[K] extends (...args:any)=>any?ReturnType<T[K]>:T[K]
