import {Quotable} from "oicq";

declare module '@oitq/core'{
    import { EventEmitter } from "events";
    import { Dict, Awaitable } from "@oitq/utils";
    import {Sendable, Client,LogLevel, Config, EventMap,FaceElem, ImageElem, MessageElem, VideoElem } from 'oicq';
    import { MaybeArray,Define, Extend } from "@oitq/utils";
    import { MessageRet } from "oicq/lib/events";
    export interface Session {
        self_id?:number
        message_type?: string;
        message?: MessageElem[];
        post_type?: string;
        notice_type?: string;
        request_type?: string;
        user_id?: number;
        group_id?: number;
        discuss_id?: number;
        sub_type?: string;
        reply?(content: Sendable, quote?: boolean): Promise<MessageRet>;
    }
    export type Computed<T> = T | ((session: NSession<'message'>) => T);
    export interface Parsed {
        content: string;
        prefix: string;
        appel: boolean;
    }
    export interface SuggestOptions {
        target: string;
        items: string[];
        prefix?: string;
        suffix: string;
        minSimilarity?: number;
        apply: (this: NSession<'message'>, suggestion: string) => Awaitable<void | string>;
    }
    export class Session {
        app: App;
        bot: Bot;
        parsed?: Parsed;
        cqCode?:string
        constructor(app: App, bot: Bot, data: Dict);
        middleware(middleware: Middleware): () => boolean;
        private promptReal;
        prompt<T extends keyof Prompt.TypeKV>(options: Prompt.Options<T> | Array<Prompt.Options<T>>): Promise<Prompt.Answers<Prompt.ValueType<T>>>;
        private _handleShortcut;
        execute(content?: string,autoReply?:boolean): Promise<boolean|Sendable|MessageRet>;
        getChannelId(): string;
        resolveValue<T>(source: T | ((session: Session) => T)): T;
        text(path: string | string[], params?: object): string;
        toJSON(): {
            [k: string]: any;
        };
    }

    export enum PluginType {
        Builtin = "builtin",
        Official = "official",
        Community = "community",
        Custom = "custom"
    }
    export namespace Prompt {
        export interface Options<T extends keyof TypeKV> {
            type: T | Falsy | PrevCaller<T, T | Falsy>;
            name?: string;
            label?: Sendable;
            message?: Sendable;
            prefix?: string;
            action?: string;
            validate?: Regexp|((message: string) => boolean);
            errorMsg?: string;
            separator?: string | PrevCaller<T, string>;
            choices?: ChoiceItem[] | PrevCaller<T, ChoiceItem[]>;
            initial?: ValueType<T> | PrevCaller<T, ValueType<T>>;
            timeout?: number;
            format?: (value: ValueType<T>) => ValueType<T>;
        }
        type Falsy = false | null | undefined;
        type PrevCaller<T extends keyof TypeKV, R = T> = (prev: any, answer: Dict, options: Options<T>) => R;
        export interface ChoiceItem {
            title: string;
            value: any;
        }
        export interface TypeKV {
            text: string;
            any: any;
            video: VideoElem;
            image: ImageElem;
            face: FaceElem;
            number: number;
            list: any[];
            confirm: boolean;
            date: Date;
            select: any;
            multipleSelect: any[];
        }
        export type Answers<V extends any = any> = {
            [id in string]: V;
        };
        export type ValueType<T extends keyof TypeKV> = T extends keyof TypeKV ? TypeKV[T] : any;
        export function formatValue<T extends keyof TypeKV>(prev: any, answer: Dict, option: Options<T>, message: MessageElem[]): ValueType<T>;
        export function getPrefix(type: keyof TypeKV): "请选择" | "是否确认" | "上传" | "请输入";
        export function formatOutput<T extends keyof TypeKV>(prev: any, answer: Dict, options: Options<T>): (string | MessageElem)[];
        export {};
    }

    export interface PluginDesc {
        name: string;
        type: PluginType;
        fullName?: string;
        desc?: string;
        author?: string;
        version?: string;
        isInstall?: boolean;
        binds?: number[];
    }
    export interface PluginConfig {
        name: string;
        config?: any;
    }
    export namespace Plugin {
        interface State {
            context: Context;
            children: Context[];
            disposes: Dispose[];
            plugin: Plugin;
        }
    }
    export class Plugin extends EventEmitter {
        readonly name: string;
        protected readonly fullpath: string;
        protected readonly path: string;
        protected hooks: PluginManager.Object;
        readonly binds: Set<Bot>;
        using: readonly (keyof Context.Services)[];
        private config;
        context: Context;
        constructor(name: string, hooks: string | PluginManager.Object);
        protected _editBotPluginCache(bot: Bot, method: "add" | "delete"): Promise<boolean>;
        get logger(): import('log4js').Logger;
        install(context: Context, config?: any): Promise<void>;
        enable(bot: Bot): Promise<void>;
        disable(bot: Bot): Promise<void>;
        uninstall(context: Context): Promise<void>;
        restart(): Promise<void>;
    }
    export class PluginManager {
        app: App;
        config: PluginManager.Config;
        plugins: Map<string, Plugin>;
        get logger(): import('log4js').Logger;
        constructor(app: App, config: PluginManager.Config);
        import(name: string): Plugin;
        install(context: Context, plugin: Plugin, config?: any): void;
        checkInstall(name: string): Plugin;
        uninstall(name: string): Promise<void>;
        restart(name: string): Promise<void>;
        enable(name: string, bot: Bot): Promise<void>;
        disable(name: string, bot: Bot): Promise<void>;
        disableAll(bot: Bot): Promise<void>;
        loadAllPlugins(): PluginDesc[];
        /**
         * 恢复bot的插件服务
         * @param {Bot} bot
         */
        restore(bot: Bot): Promise<Map<string, Plugin>>;
    }
    export namespace PluginManager {
        const defaultConfig: Config;
        type Plugin = Function | Object;
        type Function<T = any> = (ctx: Context, options: T) => Awaitable<any>;
        interface Object<T = any> {
            install: Function<T>;
            name?: string;
            uninstall?(ctx: Context): Awaitable<any>;
            enable?(bot: Bot): Awaitable<any>;
            disable?(bot: Bot): Awaitable<any>;
        }
        type Option<T extends Plugin> = T extends Function<infer U> ? U : T extends Object<infer U> ? U : never;
        interface Config {
            plugin_dir?: string;
            plugins?: PluginConfig[];
        }
    }

    export declare namespace Plugin {
        interface State {
            id: string;
            context?: Context;
            config?: any;
            using: readonly (keyof Context.Services)[];
            plugin?: Plugin;
            children: Plugin[];
            disposables: Dispose[];
        }
    }
    export type Middleware = (session: NSession<'message'>) => Awaitable<boolean | Sendable | void>;
    export type LoginType = 'qrcode' | 'password';
    export interface BotOptions {
        uin?: number;
        config: Config;
        type: LoginType;
        password?: string;
        master?: number;
        admins?: number[];
        parent?: number;
    }
    export type ToSession<A extends any[] = []> = A extends [object, ...infer O] ? Extend<Define<Session, 'args', O>, A[0]> : Define<Session, 'args', A>;
    export type NSession<E extends keyof EventMap> = ToSession<Parameters<EventMap[E]>>;
    type Transform = {
        [P in keyof EventMap as `bot.${P}`]: (session: NSession<P>) => void;
    };

    export type TargetType = 'group' | 'private' | 'discuss';
    export type ChannelId = `${TargetType}:${number}`;
    export type MsgChannelId = `${number}-${TargetType}:${number}`;
    export interface BotEventMap extends Transform {
        'bot.add'(bot: Bot): void;
        'bot.remove'(bot: Bot): void;
    }
    export class Bot extends Client {
        app: App;
        private options;
        middlewares: Middleware[];
        admins:number[]
        master:number
        constructor(app: App, options: BotOptions);
        isMaster(user_id: number): boolean;
        isAdmin(user_id: number): boolean;
        middleware(middleware: Middleware, prepend?: boolean): () => boolean;
        startProcessLogin(): void;
        createAdminLink<E extends keyof EventMap>(event: `bot.${E}`, admins: number[], bot: Bot): Promise<Extend<Define<Session, "args", []>, import("oicq").PrivateMessageEvent>>;
        startBotLogin(session: NSession<'message.private'>, bot: Bot): void;
        handleCommand(session: NSession<'message'>): Promise<any>;
        handleMessage(session: NSession<'message'>): Promise<any>;
        emit<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>): boolean;
        createSession<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>): ToSession<Parameters<EventMap<any>[E]>>;
        /**
         * 发送消息
         * @param channelId 通道id
         * @param content 消息内容，如果为CQ码会自动转换
         * @param source 引用的消息，为string时代表消息id
         */
        sendMsg(channelId: ChannelId, content: Sendable, source?: Quotable | string): Promise<MessageRet>;
        broadcast(channelIds:(number|ChannelId)[],msg:Sendable):Promise<MessageRet[]>
    }
    export class BotList extends Array<Bot> {
        app: App;
        constructor(app: App);
        get(uin: number): Bot;
        create(options: BotOptions): Bot;
        remove(uin: number): Promise<boolean>;
    }

    const selectors: readonly ["user", "group", "self", "private"];
    export type SelectorType = typeof selectors[number];
    export type SelectorValue = boolean | MaybeArray<number>;
    export type BaseSelection = {
        [K in SelectorType as `$${K}`]?: SelectorValue;
    };
    export interface Selection extends BaseSelection {
        $and?: Selection[];
        $or?: Selection[];
        $not?: Selection;
    }
    export type Filter = (session: NSession<'message'>) => boolean;
    type EventName = keyof AppEventMap;
    type ServiceAction = "load" | 'change' | 'destroy' | 'enable' | 'disable';
    type ServiceListener<K extends keyof Context.Services = keyof Context.Services> = (key: K, service: Context.Services[K]) => void;
    type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never;
    type ServiceEventMap = {
        [P in ServiceAction as `service.${P}`]: ServiceListener;
    };
    export type BeforeEventMap = {
        [E in EventName & string as OmitSubstring<E, 'before-'>]: AppEventMap[E];
    };
    export interface AppEventMap extends BotEventMap, ServiceEventMap {
        'ready'(): void;
        'dispose'(): void;
        'command/before-execute'(argv: Argv): Awaitable<void | string>;
        'before-parse'(content: string, session: NSession<'message'>): void;
        'before-attach'(session: NSession<'message'>): void;
        'attach'(session: NSession<'message'>): void;
        'bot-added'(bot: Bot): void;
        'bot-removed'(bot: Bot): void;
        'plugin-added'(plugin: Plugin): void;
        'plugin-removed'(plugin: Plugin): void;
        'before-command'(argv: Argv): Awaitable<void | string>;
        'help/command'(output: string[], command: Command, session: NSession<'message'>): void;
        'help/option'(output: string, option: Argv.OptionDeclaration, command: Command, session: NSession<'message'>): string;
    }
    export type Dispose = () => boolean;
    export interface Context extends Context.Services {
        on<E extends keyof AppEventMap>(name: E, listener: AppEventMap[E], prepend?: boolean): Dispose;
        on<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, listener: (...args: any) => void, prepend?: boolean): Dispose;
        before<E extends keyof BeforeEventMap>(name: E, listener: BeforeEventMap[E], append?: boolean): Dispose;
        before<S extends string | symbol>(name: S & Exclude<S, keyof BeforeEventMap>, listener: (...args: any) => void, append?: boolean): Dispose;
        once<E extends keyof AppEventMap>(name: E, listener: AppEventMap[E], prepend?: boolean): Dispose;
        once<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, listener: (...args: any) => void, prepend?: boolean): Dispose;
        addEventListener<E extends keyof AppEventMap>(name: E, listener: AppEventMap[E], prepend?: boolean): Dispose;
        addEventListener<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, listener: (...args: any) => void, prepend?: boolean): Dispose;
        emit<E extends keyof AppEventMap>(name: E, ...args: Parameters<AppEventMap[E]>): boolean;
        emit<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, ...args: any[]): boolean;
    }
    export class Context extends Events {
        filter: Filter;
        app?: App;
        constructor(filter: Filter, app?: App);
        logger(name: string): import("log4js").Logger;
        intersect(arg: Filter | Context): Context;
        private _property;
        exclude(arg: Filter | Context): Context;
        any(): Context;
        never(): Context;
        union(arg: Filter | Context): Context;
        user(...values: number[]): Context;
        group(...values: number[]): Context;
        private(...values: number[]): Context;
        get state(): Plugin.State;
        dispose(plugin?: Plugin): Plugin.State;
        static service<K extends keyof Context.Services>(key: K): void;
        select(options: Selection): Context;
        match(session?: NSession<'message'>): boolean;
        broadcast(msgChannelIds: MsgChannelId | MsgChannelId[], msg: Sendable): Promise<void>;
        using<T extends PluginManager.Plugin>(using: readonly (keyof Context.Services)[], plugin: T, config?: PluginManager.Option<T>): this;
        get state(): Plugin.State;
        dispose(plugin?: Plugin): void;
        middleware(middleware: Middleware): Dispose;
        plugin(name: string, config?: any): this;
        plugin<T extends PluginManager.Plugin>(plugin: T, config?: PluginManager.Option<T>): this;
        command<D extends string>(def: D, config?: Command.Config): Command<Argv.ArgumentType<D>>;
        command<D extends string>(def: D, desc: string, config?: Command.Config): Command<Argv.ArgumentType<D>>;
    }
    export namespace Context {
        export interface Services {
            pluginManager: PluginManager;
            bots: BotList;
        }
        export function service<K extends keyof Services>(key: K): void;
    }

    export class Events {
        app?: App;
        _hooks: Record<keyof any, [App | Context, (...args: any[]) => any][]>;
        private static metaWords;
        constructor(app?: App);
        private getListeners;
        private static createRegStr;
        parallel<K extends EventName>(name: K, ...args: any[]): Promise<void>;
        parallel<K extends EventName>(target: any, name: K, ...args: any[]): Promise<void>;
        emit<K extends EventName>(name: K, ...args: any[]): void;
        emit<K extends EventName>(target: any, name: K, ...args: any[]): void;
        waterfall<K extends EventName>(name: K, ...args: any[]): Promise<any>;
        waterfall<K extends EventName>(target: any, name: K, ...args: any[]): Promise<any>;
        chain<K extends EventName>(name: K, ...args: any[]): any;
        chain<K extends EventName>(target: any, name: K, ...args: any[]): any;
        serial<K extends EventName>(name: K, ...args: any[]): Promise<any>;
        serial<K extends EventName>(target: any, name: K, ...args: any[]): Promise<any>;
        bail<K extends EventName>(name: K, ...args: any[]): any;
        bail<K extends EventName>(target: any, name: K, ...args: any[]): any;
        on<K extends EventName>(name: K, listener: (...args: any[]) => void, prepend?: boolean): () => boolean;
        before<K extends string>(name: K, listener: (...args: any) => void, append?: boolean): () => boolean;
        once(name: EventName, listener: (...args: any[]) => void, prepend?: boolean): () => boolean;
        off<K extends EventName>(name: K, listener: (...args: any[]) => void): boolean;
    }

    interface KoaOptions {
        env?: string;
        keys?: string[];
        proxy?: boolean;
        subdomainOffset?: number;
        proxyIpHeader?: string;
        maxIpsCount?: number;
    }
    export interface AppOptions extends KoaOptions, PluginManager.Config {
        start?: boolean;
        prefix?: Computed<string | string[]>;
        minSimilarity?: number;
        bots?: BotOptions[];
        delay?: Dict<number>;
        admins?: number[];
        token?: string;
        dir?: string;
        logLevel?: LogLevel;
        maxListeners?: number;
        port?: number;
        path?: string;
    }
    interface CommandMap extends Map<string, Command> {
        resolve(key: string): Command;
    }
    export interface App {
        start(...args: any[]): Awaitable<void>;
    }
    export class App extends Context {
        status: boolean;
        _commandList: Command[];
        _commands: CommandMap;
        _shortcuts: Command.Shortcut[];
        disposeState: Map<Plugin, Plugin.State>;
        app: App;
        options: AppOptions;
        constructor(options?: AppOptions | string);
        getCommand(name: string): Command<any[], {}>;
        prepare(): void;
        addBot(options: BotOptions): Bot;
        removeBot(uin: number): Promise<boolean>;
    }
    export const dir: string;
    export const defaultAppOptions: AppOptions;
    export const defaultBotOptions: BotOptions;
    export function getAppConfigPath(dir?: string): string;
    export function getBotConfigPath(dir?: string): string;
    export * from '@oitq/utils'


    export interface Token {
        rest?: string;
        content: string;
        quoted: boolean;
        terminator: string;
        inters: Argv[];
    }
    export interface Argv<A extends any[] = any[], O = {}> {
        args?: A;
        options?: O;
        error?: string;
        source?: string;
        initiator?: string;
        terminator?: string;
        command?: Command<A, O>;
        rest?: string;
        pos?: number;
        root?: boolean;
        tokens?: Token[];
        name?: string;
        session?:NSession<'message'>
        bot?:Bot
    }
    export namespace Argv {
        export interface Interpolation {
            terminator?: string;
            parse?(source: string): Argv;
        }
        export function interpolate(initiator: string, terminator: string, parse?: (source: string) => Argv): void;
        export function escapeRegExp(source: string): string;
        export class Tokenizer {
            private readonly bracs;
            constructor();
            interpolate(initiator: string, terminator: string, parse?: (source: string) => Argv): void;
            parseToken(source: string, stopReg?: string): Token;
            parse(source: string, terminator?: string): Argv;
            stringify(argv: Argv): string;
        }
        export function parse(source: string, terminator?: string): Argv<any[], {}>;
        export function stringify(argv: Argv): string;
        export function revert(token: Token): void;
        export interface Domain {
            string: string;
            number: number;
            boolean: boolean;
            text: string;
            rawtext: string;
            user: string;
            channel: string;
            integer: number;
            posint: number;
            natural: number;
            date: Date;
        }
        type DomainType = keyof Domain;
        type ParamType<S extends string, F> = S extends `${any}:${infer T}` ? T extends DomainType ? Domain[T] : F : F;
        type Replace<S extends string, X extends string, Y extends string> = S extends `${infer L}${X}${infer R}` ? `${L}${Y}${Replace<R, X, Y>}` : S;
        type ExtractAll<S extends string, F> = S extends `${infer L}]${infer R}` ? [ParamType<L, F>, ...ExtractAll<R, F>] : [];
        type ExtractFirst<S extends string, F> = S extends `${infer L}]${any}` ? ParamType<L, F> : boolean;
        type ExtractSpread<S extends string> = S extends `${infer L}...${infer R}` ? [...ExtractAll<L, string>, ...ExtractFirst<R, string>[]] : [...ExtractAll<S, string>, ...string[]];
        export type ArgumentType<S extends string> = ExtractSpread<Replace<S, '>', ']'>>;
        export type OptionType<S extends string> = ExtractFirst<Replace<S, '>', ']'>, any>;
        export type Type = DomainType | RegExp | string[] | Transform<any>;
        export interface Declaration {
            name?: string;
            type?: Type;
            fallback?: any;
            variadic?: boolean;
            required?: boolean;
        }
        export type Transform<T> = (source: string) => T;
        export interface DomainConfig<T> {
            transform?: Transform<T>;
            greedy?: boolean;
        }
        export function resolveConfig(type: Type): DomainConfig<any>;
        export function createDomain<K extends keyof Domain>(name: K, transform: Transform<Domain[K]>, options?: DomainConfig<Domain[K]>): void;
        interface DeclarationList extends Array<Declaration> {
            stripped: string;
        }
        export function parseDecl(source: string): DeclarationList;
        export function parseValue(source: string, quoted: boolean, kind: string, argv: Argv, decl?: Declaration): any;
        export interface OptionConfig<T extends Type = Type> {
            value?: any;
            fallback?: any;
            type?: T;
            /** hide the option by default */
            hidden?: boolean;
            authority?: number;
            notUsage?: boolean;
        }
        export interface TypedOptionConfig<T extends Type> extends OptionConfig<T> {
            type: T;
        }
        export interface OptionDeclaration extends Declaration, OptionConfig {
            description?: string;
            values?: Record<string, any>;
        }
        export type OptionDeclarationMap = Record<string, OptionDeclaration>;
        export {};
    }

    export namespace Command {
        export type Extend<O extends {}, K extends string, T> = {
            [P in K | keyof O]?: (P extends keyof O ? O[P] : unknown) & (P extends K ? T : unknown);
        };
        interface Config {
            /** hide all options by default */
            hideOptions?: boolean;
            /** hide command */
            hidden?: boolean;
            /** min authority */
            authority?: number;
            /** disallow unknown options */
            checkUnknown?: boolean;
            /** check argument count */
            checkArgCount?: boolean;
            /** show command warnings */
            showWarning?: boolean;
            /** usage identifier */
            usageName?: string;
            maxUsage?: number;
            /** min interval */
            minInterval?: number;
            /** depend on existing commands */
            patch?: boolean;
        }
        interface Shortcut {
            name?: string | RegExp;
            command?: Command;
            authority?: number;
            prefix?: boolean;
            fuzzy?: boolean;
            args?: string[];
            options?: Record<string, any>;
        }
        type Action<A extends any[] = any[], O extends {} = {}> = (argv: Argv<A, O>, ...args: A) => any | Promise<any>;
    }

    export declare class Command<A extends any[] = any[], O extends {} = {}> {
        name: string;
        description: string;
        declaration: string;
        config: Command.Config;
        _examples: string[];
        _aliases: string[];
        private _actions;
        private _checkers;
        _arguments: Argv.Declaration[];
        _options: Argv.OptionDeclarationMap;
        parent: Command;
        children: Command[];
        context:Context
        private _namedOptions;
        private _symbolicOptions;
        private _assignOption;
        constructor(name: string, declaration: string, description: string);
        option<K extends string>(name: K, desc: string, config: Argv.TypedOptionConfig<RegExp>): Command<A, Command.Extend<O, K, string>>;
        option<K extends string, R>(name: K, desc: string, config: Argv.TypedOptionConfig<(source: string) => R>): Command<A, Command.Extend<O, K, R>>;
        option<K extends string, R extends string>(name: K, desc: string, config: Argv.TypedOptionConfig<R[]>): Command<A, Command.Extend<O, K, R>>;
        option<K extends string, D extends string>(name: K, desc: D, config?: Argv.OptionConfig): Command<A, Command.Extend<O, K, Argv.OptionType<D>>>;
        alias(...names: string[]): this;
        example(example: string): this;
        shortcut(name: string | RegExp, config?: Command.Shortcut):Command<A,O>
        match(session?: NSession<'message'>) :boolean
        check(callback: Command.Action<A, O>, prepend?: boolean): this;
        action(callback: Command.Action<A, O>, append?: boolean): this;
        parse(argv: Argv): Argv;
        parse(source: string, terminator?: string, args?: any[], options?: Record<string, any>): Argv;
        execute(argv: string | Argv): Promise<boolean|Sendable|MessageRet>;
        subcommand<D extends string>(def: D, config?: Command.Config): Command<Argv.ArgumentType<D>>;
        subcommand<D extends string>(def: D, desc: string, config?: Command.Config): Command<Argv.ArgumentType<D>>;
        private stringifyArg;
        stringify(args: readonly string[], options: any): string;
    }
    export declare function defineCommand<D extends string>(def: D, config?: Command.Config): Command<Argv.ArgumentType<D>>;
    export declare function defineCommand<D extends string>(def: D, desc: string, config?: Command.Config): Command<Argv.ArgumentType<D>>;
}
