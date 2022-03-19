import {NSession} from "@/core/bot";
import {FaceElem, ImageElem, MessageElem, Sendable, VideoElem} from "oicq";
export namespace Prompt{
    export interface Options<T extends keyof TypeKV>{
        type:T,
        name?:string
        label?:Sendable
        prefix?:string
        action?:string
        validate?(message:Sendable):boolean
        errorMsg?:string
        separator?:string
        choices?:ChoiceItem[]
        initial?:ValueType<T>
        timeout?:number
        format?(value:ValueType<T>):ValueType<T>
    }
    export interface ChoiceItem{
        title:string
        value:any
    }
    export interface TypeKV{
        text:string,
        any:any
        video:VideoElem
        image:ImageElem
        face:FaceElem
        number:number,
        list:any[]
        confirm:boolean
        date:Date
        select:any
        multipleSelect:any[]
    }
    export type ValueType<T extends keyof TypeKV>= T extends keyof TypeKV?TypeKV[T]:any
    export function formatValue<T extends keyof TypeKV>(session:NSession<'message'>,type:T,option:Options<T>):ValueType<T>{
        let  result
        switch (type){
            case 'any':
                result=session.message
            case "text":
                if(session.message.length===1&& session.message[0].type==='text'){
                    result=session.message[0].text;
                }else result=option.initial||''
                break;
            case 'face':
                if(session.message.length===1&&['face','sface','bface'].includes(session.message[0].type)){
                    result=session.message[0]
                }
                break;
            case 'video':
                if(session.message.length===1&&session.message[0].type==='video'){
                    result=session.message[0]
                }
                break;
            case 'image':
                if(session.message.length===1&&session.message[0].type==='image'){
                    result=session.message[0]
                }
                break;
            case "number":
                if(session.message.length===1&& session.message[0].type==='text' && /^\d+$/.test(session.message[0].text)){
                    result=Number(session.message[0].text)
                }else result=option.initial
                break;
            case "list":
                if(session.message.length===1&& session.message[0].type==='text' && new RegExp(`^(.*)(${option.separator}.*)?$`).test(session.message[0].text)){
                    result=session.message[0].text.split(option.separator)
                }else{
                    result=option.initial||[]
                }
                break;
            case "date":
                if(session.message.length===1&& session.message[0].type==='text' && new Date(session.message[0].text).toString()!=='Invalid Date'){
                    result=new Date(session.message[0].text)
                }else{
                    result=option.initial||new Date()
                }
                break;
            case "confirm":
                if(session.message.length===1&& session.message[0].type==='text' && ['y','yes','.','。'].includes(session.message[0].text.toLowerCase())){
                    result=true
                }else{
                    result=option.initial||false
                }
                break;
            case 'select':
                if(session.message.length===1&& session.message[0].type==='text' && /^\d+$/.test(session.message[0].text)){
                    result=option.choices[Number(session.message[0].text)-1].value
                }else option.initial
                break;
            case 'multipleSelect':
                const reg=new RegExp(`^(\d+)(${option.separator}\d+)?$`)
                console.log(reg)
                if(session.message.length===1&& session.message[0].type==='text' && reg.test(session.message[0].text)){
                    result=session.message[0].text
                        .split(option.separator)
                        .map(Number).map(index=>option.choices[index-1].value)
                }else{
                    result=option.initial||[]
                }
                break;
        }
        if(option.format){
            return option.format(result)
        }
        return result
    }
    export function getPrefix(type:keyof TypeKV){
        switch (type){
            case "select":
            case 'multipleSelect':
                return '请选择'
            case 'confirm':
                return '是否确认'
            case 'video':
            case 'image':
                return '上传'
            default :
                return '请输入'
        }
    }
    export function formatOutput<T extends keyof TypeKV>(options:Options<T>){
        let result:Sendable=[]
        if(!options.name && !options.prefix) throw new Error('name/prefix is required')
        const titleArr=[
            `${getPrefix(options.type)}${options.action||''}${options.label||options.name||''}`,
            `${options.initial !==undefined && !['select','multipleSelect'].includes(options.type)?`默认：${options.initial}`:''}`,
            `${['list','multipleSelect'].includes(options.type)?`多项使用'${options.separator}'分隔`:''}`
        ].filter(Boolean)
        if(options.prefix){titleArr.shift()}
        result=result.concat(titleArr.join(','),'\n')
        if(options.prefix)result.unshift(options.prefix)
        if (options.type==='confirm')result.push("输入y[es]或句号(.或。)以确认，其他内容取消(不区分大小写)")
        switch (options.type){
            case "text":
            case 'number':
            case "date":
            case "confirm":
            case 'list':
                break;
            case "select":
            case 'multipleSelect':
                if(!options.choices) throw new Error('choices is required')
                result.push(
                    options.choices.map((option,index)=>`${index+1}:${option.title}${option.value===options.initial?' (默认)':''}`).join('\n'),
                    '\n输入指定选项前边的索引即可'
                )
        }
        return result
    }
}
