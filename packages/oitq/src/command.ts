import {Define} from "@oitq/utils";
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
    // 定义指令调用所需权限
    auth(authority:number){
        this.authority=authority
    }
    // 添加指令描述文本
    desc(desc:string){
        this.descriptions.push(desc)
        return this
    }
    // 添加验证回调函数
    check(checker:Command.Callback<A,O>){
        this.checkers.push(checker)
        return this
    }
    // 定义样例
    example(example:string){
        this.examples.push(example)
        return this
    }
    match(session:NSession<'message'>){
        return this.triggerEvent==='message'
        || `message.${session.message_type}`===this.triggerEvent
    }
    // 定义别名
    alias(...name:string[]){
        this.aliasNames.push(...name)
        return this
    }
    // 为指令添加其他选项
    use(callback:(cmd:Command)=>any){
        callback(this)
    }
    // 添加快捷方式
    shortcut(reg:RegExp|string,config:Command.Shortcut={}){
        this.shortcuts.push({...config,name:reg})
        return this
    }
    // 定义子指令
    subcommand<D extends string>(def: D,triggerEvent:keyof EventMap): Command<Action.ArgumentType<D>> {
        const command=this.plugin.command(def,triggerEvent)
        command.parent=this
        this.children.push(command)
        return command
    }
    // 添加选项
    option<K extends string,D extends string>(name:K,declaration:D,config:Command.OptionConfig={}):Command<A, Define<O, K, Command.OptionType<D>>>{
        const decl = declaration.replace(/(?<=^|\s)[\w\x80-\uffff].*/, '')
        const shortName= Command.removeDeclarationArgs(decl);
        const argDeclaration = Command.findDeclarationArgs(decl)[0]
        let desc = declaration.slice(decl.length).replace(/(?<=^|\s)(<[^<]+>|\[[^[]+\]).*/, '')
        desc = desc.trim() || '--' + name
        if(this.options[name]){
            throw new Error(`command "${this.name}" 的option名重复定义 "${name}"`)
        }
        if(this.options[argDeclaration.name]){
            throw new Error(`command "${this.name}" 的option 缩写名重复使用 "${shortName}"`)
        }
        this.options[shortName] ||= {
            name,
            shortName,
            description: desc,
            ...config,
            declaration:argDeclaration
        }
        this.options[name] ||= {
            name,
            shortName,
            description: desc,
            ...config,
            declaration:argDeclaration
        }
        return Object.create(this)
    }
    // 添加执行的操作
    action(action:Command.Callback<A,O>){
        this.actions.push(action)
        return this
    }
    //匹配常规调用参数、选项
    private parseCommand(action:Action<A,O>){
        const args:A=action.args||=[] as A
        const options:O=action.options||={} as O
        while (!action.error && action.argv.length) {
            const content=action.argv.shift()
            const argDecl=this.args[args.length]
            if (content[0] !== '-' && Action.resolveConfig(argDecl?.type).greedy) {
                args.push(Action.parseValue([content, ...action.argv].join(' '), 'argument', action, argDecl));
                break;
            }
            if (content[0] !== '-' && !Object.values(this.options).find(opt=>opt.shortName===content) && argDecl) {
                if(argDecl.variadic){
                    args.push(...[content].concat(action.argv).map(str=>Action.parseValue(str, 'argument', action, argDecl)));
                    break;
                }else {
                    args.push(Action.parseValue(content, 'argument', action, argDecl));
                    continue;
                }
            }
            const optionDecl=[...Object.values(this.options)].find(decl=>decl.shortName===content)
            if(optionDecl && !options[optionDecl.name]){
                if(optionDecl.declaration.required && !optionDecl.initial && (!action.argv[0] || options[action.args[0]])){
                    action.error=`option ${optionDecl.name} is required`
                    continue
                }else{
                    if(!options[action.argv[0]] && optionDecl.declaration.type!=="boolean"){
                        if(optionDecl.declaration.variadic){
                            options[optionDecl.name]=Action.parseValue(action.argv.join(' '),'option',action,optionDecl.declaration)
                            break;
                        }else{
                            options[optionDecl.name]=Action.parseValue(action.argv.shift(),'option',action,optionDecl.declaration)
                        }
                    }else if(optionDecl.declaration.type==='boolean'){
                        options[optionDecl.name]=Action.parseValue(content,'option',action,optionDecl.declaration)
                    }else if(optionDecl.initial){
                        options[optionDecl.name]=optionDecl.initial
                    }
                    continue
                }
            }
        }

        // assign default values
        for (const [,{name,initial }] of Object.entries(this.options)) {
            if (initial !== undefined && !(name in options)) {
                options[name] = initial
            }
        }
        action.options=options as O
        action.args=args as A
    }
    //匹配快捷方式参数、选项
    private parseShortcut(action:Action){
        const args=action.args||=[],options=action.options||={}
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
                            shortcut.args.forEach((arg,i)=>{
                                if(typeof arg==='string' && arg.includes(`${index}`)){
                                    args.push(Action.parseValue(arg.replace(`$${index}`,str),'argument',action,this.args[i]))
                                }
                            })
                        }
                        if(shortcut.option){
                            Object.keys(shortcut.option).forEach(key=>{
                                if(this.options[key] && typeof shortcut.option[key]==='string' && shortcut.option[key].includes(`$${index}`)){
                                    options[key]=Action.parseValue(shortcut.option[key].replace(`$${index}`,str),'option',action,Object.values(this.options).find(opt=>opt.name=key))
                                }
                            })
                        }
                    })
                }
            }
        }
        return {args,options}
    }
    // 执行指令
    async execute(action:Action<A, O>){
        // 匹配参数、选项
        this.parseShortcut(action)
        if(action.error){
            return action.error
        }
        this.parseCommand(action)
        if(action.error){
            return action.error
        }
        for(const callback of this.checkers){
            const result=await callback.call(this,action,...action.args)
            if(result)return result
        }
        for(const callback of this.actions){
            const result=await callback.call(this,action,...action.args)
            if(result)return result
        }
    }
}
export namespace Command{
    export interface Shortcut {
        name?: string | RegExp;
        fuzzy?: boolean;
        args?: any[];
        option?: Record<string, any>;
    }
    export interface OptionConfig<T extends Action.Type = Action.Type> {
        value?: any
        initial?: any
        name?:string
        shortName?:string
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
