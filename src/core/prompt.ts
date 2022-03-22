import {FaceElem, ImageElem, MessageElem, Sendable, VideoElem} from "oicq";
import {Dict} from "@/utils";
export namespace Prompt{
    export interface Options<T extends keyof TypeKV>{
        type:T | Falsy | PrevCaller<T,T|Falsy>,
        name?:string
        label?:Sendable
        message?:Sendable
        prefix?:string
        action?:string
        validate?:(message:Sendable)=>boolean
        errorMsg?:string
        separator?:string|PrevCaller<T, string>
        choices?:ChoiceItem[]|PrevCaller<T,ChoiceItem[]>
        initial?:ValueType<T>|PrevCaller<T, ValueType<T>>
        timeout?:number
        format?:(value:ValueType<T>)=>ValueType<T>
    }
    type Falsy = false | null | undefined;
    type PrevCaller<T extends keyof TypeKV,R=T> = (
        prev: any,
        answer: Dict,
        options: Options<T>
    ) => R;
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
    export function formatValue<T extends keyof TypeKV>(prev:any,answer:Dict,option:Options<T>,message:MessageElem[]):ValueType<T>{
        const type=typeof option.type==="function"?option.type(prev,answer,option):option.type
        const separator=typeof option.separator==='function'?option.separator(prev,answer,option):option.separator
        // @ts-ignore
        const initial:ValueType<T>=typeof option.initial==='function'?option.initial(prev,answer,option):option.initial
        let  result
        switch (type){
            case 'any':
                result=message
                break;
            case "text":
                if(message.length===1&& message[0].type==='text'){
                    result=message[0].text;
                }else result=initial||''
                break;
            case 'face':
                if(message.length===1&&['face','sface','bface'].includes(message[0].type)){
                    result=message[0]
                }
                break;
            case 'video':
                if(message.length===1&&message[0].type==='video'){
                    result=message[0]
                }
                break;
            case 'image':
                if(message.length===1&&message[0].type==='image'){
                    result=message[0]
                }
                break;
            case "number":
                if(message.length===1&& message[0].type==='text' && /^\d+$/.test(message[0].text)){
                    result=Number(message[0].text)
                }else result=initial
                break;
            case "list":
                if(message.length===1&& message[0].type==='text' && new RegExp(`^(.*)(${option.separator}.*)?$`).test(message[0].text)){
                    result=message[0].text.split(separator)
                }else{
                    result=initial||[]
                }
                break;
            case "date":
                if(message.length===1&& message[0].type==='text' && new Date(message[0].text).toString()!=='Invalid Date'){
                    result=new Date(message[0].text)
                }else{
                    result=initial||new Date()
                }
                break;
            case "confirm":
                if(message.length===1&& message[0].type==='text' && ['y','yes','.','。'].includes(message[0].text.toLowerCase())){
                    result=true
                }else{
                    result=initial||false
                }
                break;
            case 'select':
                if(message.length===1&& message[0].type==='text' && /^\d+$/.test(message[0].text)){
                    result=option.choices[Number(message[0].text)-1].value
                }else result=initial
                break;
            case 'multipleSelect':
                const reg=new RegExp(`^(\\d+)(${separator}\\d+)?$`)
                if(message.length===1&& message[0].type==='text' && reg.test(message[0].text)){
                    result=message[0].text.split(separator)
                        .map(Number).map(index=>option.choices[index-1].value)
                }else{
                    result=initial||[]
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
    export function formatOutput<T extends keyof TypeKV>(prev:any,answer:Dict,options:Options<T>){
        let result:Sendable=[]
        if(!options.name && !options.prefix) throw new Error('name/prefix is required')
        const titleArr=[
            `${options.message||(getPrefix(options.type as keyof TypeKV)+(options.action||'')+options.label||options.name||'')}`,
            `${options.initial !==undefined && !['select','multipleSelect'].includes(options.type as keyof TypeKV)?`默认：${options.initial}`:''}`,
            `${['list','multipleSelect'].includes(options.type as keyof TypeKV)?`多项使用'${options.separator}'分隔`:''}`
        ].filter(Boolean)
        if(options.prefix){titleArr.shift()}
        result=result.concat(titleArr.join(','),'\n')
        if(options.prefix)result.unshift(options.prefix)
        if (options.type==='confirm')result.push("输入y[es]或句号(.或。)以确认，其他内容取消(不区分大小写)")
        const choices=typeof options.choices==='function'?options.choices(prev,result,options):options.choices
        switch (options.type){
            case "text":
            case 'number':
            case "date":
            case "confirm":
            case 'list':
                break;
            case "select":
            case 'multipleSelect':
                if(!choices) throw new Error('choices is required')
                result.push(
                    choices.map((option,index)=>`${index+1}:${option.title}${option.value===options.initial?' (默认)':''}`).join('\n'),
                    '\n输入指定选项前边的索引即可'
                )
        }
        return result
    }
}
