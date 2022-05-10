import {Define, Awaitable} from "@oitq/utils";
import {Plugin} from "./plugin";
import {EventMap, Sendable} from "oicq";
import {Action} from "./argv";
import {NSession} from "./bot";

export class Command<A extends any[] = any[], O extends {} = {}>{
    public name:string
    args:Action.Declaration[]
    parent:Command=null
    children:Command[]=[]
    private authority:number=1
    descriptions:string[]=[]
    shortcuts:Command.Shortcut[]=[]
    private checkers:Command.Callback<A,O>[]=[]
    private actions:Command.Callback<A,O>[]=[]
    public examples:string[]=[]
    public aliasNames:string[]=[]
    public options:Record<string, Command.OptionConfig>={}
    constructor(declaration:string,public plugin:Plugin,public triggerEvent:keyof EventMap) {
        this.name=Command.removeDeclarationArgs(declaration)
        this.args=Command.findDeclarationArgs(declaration)
    }
    auth(authority:number){
        this.authority=authority
    }
    desc(desc:string){
        this.descriptions.push(desc)
        return this
    }
    check(checker:Command.Callback<A,O>){
        this.checkers.push(checker)
        return this
    }
    example(example:string){
        this.examples.push(example)
        return this
    }
    match(session:NSession<'message'>){
        return session.event_name===this.triggerEvent
    }
    alias(...name:string[]){
        this.aliasNames.push(...name)
        return this
    }
    use(callback:(cmd:Command)=>any){
        callback(this)
    }
    shortcut(reg:RegExp|string,config:Command.Shortcut={}){
        this.shortcuts.push({...config,name:reg})
        return this
    }

    subcommand<D extends string>(def: D,triggerEvent:keyof EventMap): Command<Action.ArgumentType<D>> {
        const command=this.plugin.command(def,triggerEvent)
        command.parent=this
        this.children.push(command)
        return command
    }
    option<K extends string,D extends string>(name:K,declaration:D,config:Command.OptionConfig={}):Command<A, Define<O, K, Command.OptionType<D>>>{
        const decl = declaration.replace(/(?<=^|\s)[\w\x80-\uffff].*/, '')
        const shortName= Command.removeDeclarationArgs(decl);
        const argDeclaration = Command.findDeclarationArgs(decl)[0]
        let desc = declaration.slice(decl.length).replace(/(?<=^|\s)(<[^<]+>|\[[^[]+\]).*/, '')
        desc = desc.trim() || '--' + name
        if(this.options[name]){
            throw new Error(`command "${this.name}" 的option名重复定义 "${name}"`)
        }
        if(Object.values(this.options).some(opt=>opt.name===shortName)){
            throw new Error(`command "${this.name}" 的option 缩写名重复使用 "${shortName}"`)
        }
        this.options[shortName] ||= {
            name:shortName,
            fullName:name,
            description: desc,
            ...config,
            declaration:argDeclaration
        }
        return Object.create(this)
    }
    action(action:Command.Callback<A,O>){
        this.actions.push(action)
        return this
    }
    parse(action:Action<A,O>, args = [], options = {}){
        while (!action.error && action.argv.length) {
            const content=action.argv.shift()
            const argDecl=this.args[args.length]
            if(content[0]!=='-' && Action.resolveConfig(argDecl?.type).greedy){
                args.push(Action.parseValue([content,...action.argv].join(' '),'argument',action,argDecl))
                break;
            }
            if(argDecl){
                args.push(Action.parseValue(content,'argument',action,argDecl))
                continue
            }else if(content[0]!=='-')continue
            const optionDecl=[...Object.values(this.options)].find(decl=>decl.name===content)
            if(optionDecl && !options[optionDecl.fullName]){
                if(optionDecl.declaration.required && !optionDecl.initial && (!action.argv[0] || options[action.args[0]])){
                    action.error=`option ${optionDecl.fullName} is required`
                    continue
                }else{
                    if(!options[action.argv[0]]){
                        options[optionDecl.fullName]=Action.parseValue(action.argv.shift(),'option',action,optionDecl.declaration)
                    }else if(optionDecl.initial){
                        options[optionDecl.fullName]=optionDecl.initial
                    }
                    continue
                }
            }
        }

        // assign default values
        for (const [,{fullName,initial }] of Object.entries(this.options)) {
            if (initial !== undefined && !(fullName in options)) {
                options[fullName] = initial
            }
        }
        action.options=options as O
        action.args=args as A
    }
    execute(action:Action<A, O>):Awaitable<boolean|Sendable|void>{
        const args=[],options={}
        for(const shortcut of this.shortcuts){
            if(typeof shortcut.name==='string' && action.source){
                args.push(...(shortcut.args||[]))
                Object.assign(options,shortcut.option||{})
            }
            if(shortcut.name instanceof RegExp){
                const matched=action.source.match(shortcut.name)
                if(matched){
                    matched.forEach((str,index)=>{
                        if(index===0)return
                        if(shortcut.args){
                            shortcut.args.forEach(arg=>{
                                args.push(arg.replace(`$${index}`,str))
                            })
                        }
                        if(shortcut.option){
                            Object.keys(shortcut.option).forEach(key=>{
                                options[key]=shortcut.option[key].replace(`$${index}`,str)
                            })
                        }
                    })
                }
            }
        }
        this.parse(action,args,options)
        for(const callback of this.checkers){
            const result=callback.call(this,action,...action.args)
            if(result)return result
        }
        for(const callback of this.actions){
            const result=callback.call(this,action,...action.args)
            if(result)return result
        }
    }
}
export namespace Command{
    export interface Shortcut {
        name?: string | RegExp;
        fuzzy?: boolean;
        args?: string[];
        option?: Record<string, any>;
    }
    export interface OptionConfig<T extends Action.Type = Action.Type> {
        value?: any
        initial?: any
        name?:string
        fullName?:string
        type?: T
        /** hide the option by default */
        hidden?: boolean
        description?:string
        declaration?:Action.Declaration
    }
    export type Callback< A extends any[] = any[], O extends {} = {},>
        = (action:Action<A,O>, ...args: A) => Sendable|void|Promise<Sendable|void>


    export type OptionType<S extends string> = Action.ExtractFirst<Action.Replace<S, '>', ']'>, any>
    export function removeDeclarationArgs(name: string): string {
        return name.replace(/[<[].+/, '').trim();
    }
    export function findDeclarationArgs(declaration: string):Action.Declaration[] {
        const res:Action.Declaration[] = [];
        const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g
        const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g
        const BOOLEAN_BRACKET_RE_GLOBAL=/(-\S)+/g
        const parse = (match: string[]) => {
            let variadic = false;
            let [value,type=match[1].startsWith('-')?'boolean':'string'] = match[1].split(':');
            if (value.startsWith('...')) {
                value = value.slice(3)
                variadic = true
            }
            return {
                required: match[0].startsWith('<'),
                name:value,
                type,
                variadic,
            } as Action.Declaration
        }

        let angledMatch
        while ((angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(declaration))) {
            res.push(parse(angledMatch))
        }

        let squareMatch
        while ((squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(declaration))) {
            res.push(parse(squareMatch))
        }
        let booleanParamMatch
        while ((booleanParamMatch=BOOLEAN_BRACKET_RE_GLOBAL.exec(declaration))){
            res.push(parse(booleanParamMatch))
        }
        return res;
    }

}
