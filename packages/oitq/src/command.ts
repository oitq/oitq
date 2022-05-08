import {NSession,Bot,Context} from "./index";
import {remove, Define, Awaitable} from "@oitq/utils";
import {Plugin} from "./plugin";
import {EventMap, Sendable} from "oicq";
import {exec} from "child_process";
import removeDeclarationArgs = Command.removeDeclarationArgs;
import findDeclarationArgs = Command.findDeclarationArgs;

export * from '@lc-cn/command'
declare module '@lc-cn/command/lib/command'{
    interface Command{
        context:Context
        shortcut(name: string | RegExp, config?: Command.Shortcut):Command
        match(session?: NSession<'message'>) :boolean
    }
}
declare module '@lc-cn/command/lib/argv'{

    interface Argv{
        session?:NSession<'message'>
        bot?:Bot
    }

}
export namespace Command{
    export interface OptionConfig<T extends Type = Type> {
        value?: any
        initial?: any
        shortName?:string
        type?: T
        /** hide the option by default */
        hidden?: boolean
        description?:string
        declaration?:Declaration
    }
    export type Runtime<A extends any[],O extends {},E extends keyof EventMap>={
        session:NSession<E>
        options:O
        args:A
    }
    export type Action< A extends any[] = any[], O extends {} = {},E extends keyof EventMap='message'>
        = (this:Runtime<A,O,E>, ...args: A) => Awaitable<Sendable|void>
    export interface Domain {
        string: string
        number: number
        boolean: boolean
        text: string
        integer: number
        date: Date
    }
    type DomainType = keyof Domain
    type ParamType<S extends string, F>
        = S extends `${any}:${infer T}` ? T extends DomainType ? Domain[T] : F : F
    type Replace<S extends string, X extends string, Y extends string>
        = S extends `${infer L}${X}${infer R}` ? `${L}${Y}${Replace<R, X, Y>}` : S
    type ExtractFirst<S extends string, F>
        = S extends `${infer L}]${any}` ? ParamType<L, F> : boolean
    export type OptionType<S extends string> = ExtractFirst<Replace<S, '>', ']'>, any>
    export type Transform<T> = (source: string) => T
    export type Type = DomainType | RegExp | string[] | Transform<any>
    export interface Declaration {
        name?: string
        type?: Type
        variadic?: boolean
        required?: boolean
    }

    export function removeDeclarationArgs(name: string): string {
        return name.replace(/[<[].+/, '').trim();
    }
    export function findDeclarationArgs(name: string):Declaration[] {
        const res:Declaration[] = [];
        const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g
        const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g

        const parse = (match: string[]) => {
            let variadic = false;
            let [value,type='string'] = match[1].split(':');
            if (value.startsWith('...')) {
                value = value.slice(3)
                variadic = true
            }
            return {
                required: match[0].startsWith('<'),
                name,
                type,
                variadic,
            } as Declaration
        }

        let angledMatch
        while ((angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(name))) {
            res.push(parse(angledMatch))
        }

        let squareMatch
        while ((squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(name))) {
            res.push(parse(squareMatch))
        }

        return res;
    }

}
export class Command<A extends any[] = any[], O extends {} = {},E extends keyof EventMap='message'>{
    public name:string
    args:Command.Declaration[]
    descriptions:string[]=[]
    private triggerEvent:E
    shortcuts:RegExp[]=[]
    private checkers:Command.Action<A,O,E>[]=[]
    private actions:Command.Action<A,O,E>[]=[]
    private aliasNames:string[]=[]
    private _options:Record<string, Command.OptionConfig>
    constructor(declaration:string,public plugin:Plugin,triggerEvent?:E) {
        this.name=removeDeclarationArgs(declaration)
        this.args=findDeclarationArgs(declaration)
        this.triggerEvent=triggerEvent||'message' as E
    }
    desc(desc:string){
        this.descriptions.push(desc)
        return this
    }
    private checkExist(type:'name'|'sugar',value){
        return this.plugin.checkExist(type,value)
    }
    check(checker:Command.Checker){
        this.checkers.push(checker)
    }
    alias(...name:string[]){
        this.aliasNames.push(...name)
    }
    sugar(reg:RegExp){
        this.shortcuts.push(reg)
    }
    option<K extends string,D extends string>(name:K,declaration:D,config:Command.OptionConfig={}):Command<A, Define<O, K, Command.OptionType<D>>>{

        const decl = declaration.replace(/(?<=^|\s)[\w\x80-\uffff].*/, '')
        const shortName= Command.removeDeclarationArgs(decl);
        const argDeclaration = Command.findDeclarationArgs(decl)[0]
        let desc = declaration.slice(decl.length).replace(/(?<=^|\s)(<[^<]+>|\[[^[]+\]).*/, '')
        desc = desc.trim() || '--' + name
        if(this._options[name]){
            throw new Error(`command "${this.name}" 的option名重复定义 "${name}"`)
        }
        if(Object.values(this._options).some(opt=>opt.shortName===shortName)){
            throw new Error(`command "${this.name}" 的option 缩写名重复使用 "${shortName}"`)
        }
        const option = this._options[name] ||= {
            shortName,
            description: desc,
            ...config,
            declaration:argDeclaration
        }
        return this
    }
}
Command.prototype.shortcut=function (this:Command,name,config:Command.Shortcut={}){
    config.name = name
    config.command = this
    config.authority ||= this.config.authority
    this.context.app._shortcuts.push(config)
    this.context.state.disposes.push(()=>remove(this.context.app._shortcuts,config))
    return this
}
Command.prototype.match=function (this:Command,session?){
    return this.context.match(session)
}
const oldSubCommand=Command.prototype.subcommand
Command.prototype.subcommand=function(this:Command,def:string,...args:any[]){
    const command=oldSubCommand.bind(this)(def,...args)
    command.context=this.context
    this.context.app._commands.set(command.name,command)
    this.context.app._commandList.push(command)
    this.context.state.disposes.push(()=>remove(this.context.app._commandList,command),()=>{
        this.context.app._commands.delete(command.name)
        return true
    })
    this.context.emit('command.add',command)
    return command
}
