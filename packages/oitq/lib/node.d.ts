import {
    Client,
    LogLevel,
    MessageRet,
    EventMap,
    FaceElem,
    ImageElem,
    MessageElem,
    Sendable,
    VideoElem,
    Quotable
} from "oicq";
import {Awaitable, Define, Dict, Extend} from '@oitq/utils'
import { Logger } from 'log4js';
import {Config as ClientConfig} from "oicq/lib/client";
import 'oicq2-cq-enable'
export * from '@oitq/utils';

export class App extends Plugin {
    config: App.Config;
    app: this;
    middlewares: Middleware[];
    _commands: Map<string, Command>;
    commandList: Command[];
    constructor(config: App.Config);
    broadcast(msgChannelIds: MsgChannelId | MsgChannelId[], msg: Sendable): Promise<void>;
    addBot(config: Bot.Config): Bot;
    removeBot(uin: number): boolean;
    start(): Promise<void>;
}
export namespace App {
    interface Config extends PluginManager.Config {
        bots?: Bot.Config[];
        plugins?: Record<string, any>;
        delay?: Dict<number>;
        token?: string;
        logLevel?: LogLevel;
        maxListeners?: number;
    }
}
export const getAppConfigPath: (baseDir?: string) => string;
export const getBotConfigPath: (baseDir?: string) => string;
export function createApp(config?: string | App.Config): App;
export function defineConfig(config: App.Config): App.Config;



// argv.d.ts


export interface Action<A extends any[] = any[], O = {}> {
    name: string;
    argv: string[];
    source: string;
    args?: A;
    options?: O;
    error?: string;
    session?: NSession;
    bot?: Bot;
}
export namespace Action {
    export interface Domain {
        string: string;
        number: number;
        boolean: boolean;
        text: string;
        integer: number;
        date: Date;
        qq: number;
        object: Record<string, any>;
        function: Function;
    }
    type DomainType = keyof Domain;
    type ParamType<S extends string, F> = S extends `${any}:${infer T}` ? T extends DomainType ? Domain[T] : F : F;
    export type Replace<S extends string, X extends string, Y extends string> = S extends `${infer L}${X}${infer R}` ? `${L}${Y}${Replace<R, X, Y>}` : S;
    type ExtractAll<S extends string, F> = S extends `${infer L}]${infer R}` ? [ParamType<L, F>, ...ExtractAll<R, F>] : [];
    export type ExtractFirst<S extends string, F> = S extends `${infer L}]${any}` ? ParamType<L, F> : boolean;
    type ExtractSpread<S extends string> = S extends `${infer L}...${infer R}` ? [...ExtractAll<L, string>, ...ExtractFirst<R, string>[]] : [...ExtractAll<S, string>, ...string[]];
    export type ArgumentType<S extends string> = ExtractSpread<Replace<S, '>', ']'>>;
    export type Type = DomainType | RegExp | string[] | Transform<any>;
    export interface Declaration {
        name?: string;
        type?: Type;
        initial?: any;
        variadic?: boolean;
        required?: boolean;
    }
    export type Transform<T> = (source: string) => T;
    export interface DomainConfig<T> {
        transform?: Transform<T>;
        greedy?: boolean;
    }
    export function createDomain<K extends keyof Domain>(name: K, transform: Transform<Domain[K]>, options?: DomainConfig<Domain[K]>): void;
    interface DeclarationList extends Array<Declaration> {
        stripped: string;
    }
    export function parse(content: string): Action;
    export function parseDecl(source: string): DeclarationList;
    export function resolveConfig(type: Type): DomainConfig<any>;
    export function parseValue(source: string, kind: string, argv: Action, decl?: Declaration): any;
    export interface OptionConfig<T extends Type = Type> {
        value?: any;
        fallback?: any;
        type?: T;
        /** hide the option by default */
        hidden?: boolean;
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


// bot.d.ts


type Transform = {
    [P in keyof EventMap as `bot.${P}`]: (session: NSession<P>) => void;
};
export interface BotEventMap extends Transform, EventMap {
    'bot-add'(bot: Bot): void;
    'bot-remove'(bot: Bot): void;
}
export class Bot extends Client {
    app: App;
    options: Bot.Config;
    admins: number[];
    master: number;
    constructor(app: App, options: Bot.Config);
    isMaster(user_id: number): boolean;
    isAdmin(user_id: number): boolean;
    emit<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>): boolean;
    createSession<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>): import("./types").ToSession<Parameters<EventMap<any>[E]>>;
    waitMessage(filter: Filter, timout?: number): Promise<NSession | void>;
    /**
     * 获取登录信息
     */
    getLoginInfo(): {
        user_id: number;
        nickname: string;
    };
    getStatus(): {
        online: boolean;
        good: boolean;
    };
    /**
     * 发送消息
     * @param channelId 通道id
     * @param content 消息内容，如果为CQ码会自动转换
     * @param source 引用的消息，为string时代表消息id
     */
    sendMsg(channelId: ChannelId, content: Sendable, source?: Quotable | string): Promise<MessageRet>;
    broadcast(channelIds: (ChannelId | number)[], message: Sendable): Promise<any[]>;
}
export namespace Bot {
    interface Config {
        uin?: number;
        config: ClientConfig;
        nickname?: string | string[];
        master?: number;
        admins?: number[];
    }
}
export class BotList extends Array<Bot> {
    app: App;
    constructor(app: App);
    get(uin: number): Bot;
    create(options: Bot.Config): Bot;
    add(bot: Bot): this;
    remove(uin: number): boolean;
    destroy(bot: Bot): this;
}
// command.d.ts

export class Command<A extends any[] = any[], O extends {} = {}> {
    plugin: Plugin;
    triggerEvent: keyof EventMap;
    name: string;
    args: Action.Declaration[];
    parent: Command;
    children: Command[];
    authority;
    descriptions: string[];
    shortcuts: Command.Shortcut[];
    private checkers;
    private actions;
    examples: string[];
    aliasNames: string[];
    options: Record<string, Command.OptionConfig>;
    constructor(declaration: string, plugin: Plugin, triggerEvent: keyof EventMap);
    auth(authority: number): this;
    desc(desc: string): this;
    check(checker: Command.Callback<A, O>): this;
    example(example: string): this;
    match(session: NSession): boolean;
    alias(...name: string[]): this;
    use(callback: (cmd: Command) => any): void;
    shortcut(reg: RegExp | string, config?: Command.Shortcut): this;
    subcommand<D extends string>(def: D, triggerEvent: keyof EventMap): Command<Action.ArgumentType<D>>;
    option<K extends string, D extends string>(name: K, declaration: D, config?: Command.OptionConfig): Command<A, Define<O, K, Command.OptionType<D>>>;
    action(action: Command.Callback<A, O>): this;
    private parseCommand;
    private parseShortcut;
    execute(action: Action<A, O>): Promise<any>;
}
export namespace Command {
    interface Shortcut {
        name?: string | RegExp;
        fuzzy?: boolean;
        args?: any[];
        option?: Record<string, any>;
    }
    interface OptionConfig<T extends Action.Type = Action.Type> {
        value?: any;
        initial?: any;
        name?: string;
        shortName?: string;
        type?: T;
        /** hide the option by default */
        hidden?: boolean;
        description?: string;
        declaration?: Action.Declaration;
    }
    type Callback<A extends any[] = any[], O extends {} = {}> = (action: Action<A, O>, ...args: A) => Sendable | void | boolean | Promise<Sendable | void | boolean>;
    type OptionType<S extends string> = Action.ExtractFirst<Action.Replace<S, '>', ']'>, any>;
    function removeDeclarationArgs(name: string): string;
    function findDeclarationArgs(declaration: string): Action.Declaration[];
}

// event.d.ts


export type EventName = string;
export type EventListener = (...args: any[]) => Awaitable<any>;
export class EventThrower {
    private _events;
    private static metaWords;
    private _maxListenerCount;
    logger: Logger;
    constructor();
    private getListeners;
    get maxListener(): number;
    setMaxListener(n: number): void;
    private static createRegStr;
    parallel<K extends EventName>(name: K, ...args: any[]): Promise<void>;
    emit<K extends EventName>(name: K, ...args: any[]): void;
    bail<K extends EventName>(name: K, ...args: any[]): Promise<string | boolean | void>;
    on<K extends EventName>(name: K, listener: (...args: any[]) => void, prepend?: boolean): () => boolean;
    before<K extends string>(name: K, listener: (...args: any) => void, append?: boolean): () => boolean;
    off<K extends EventName>(name: K, listener: (...args: any[]) => void): boolean;
}
// mixin.d.ts

export function Mixin(...mixins: Array<new (...args: any[]) => any>): new (...args: any[]) => any;

// plugin.d.ts

export type AuthorInfo = string | {
    name: string;
    email?: string;
    url?: string;
};
export type RepoInfo = string | {
    type?: 'git' | 'svn';
    directory?: string;
    url: string;
};
export interface PkgInfo {
    name: string;
    version: string;
    description: string;
    author: AuthorInfo;
    repository: RepoInfo;
}
export enum PluginType {
    Builtin = "builtin",
    Official = "official",
    Community = "community",
    Custom = "custom"
}
export interface PluginDesc extends Partial<PkgInfo> {
    type: PluginType;
    installed?: boolean;
    disabled: boolean;
    binds?: number[];
}
export interface Plugin extends Plugin.Services {
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
export class Plugin extends EventThrower {
    static readonly immediate: unique symbol;
    app: App;
    readonly fullpath: string;
    readonly path: string;
    protected hooks: PluginManager.ObjectHook;
    _using: (keyof Plugin.Services)[];
    parent: Plugin;
    children: Plugin[];
    disposes: Dispose[];
    readonly binds: Set<Bot>;
    disableStatus: boolean;
    config: any;
    pkg: Partial<PkgInfo>;
    pluginManager: PluginManager;
    constructor(hooks: string | PluginManager.ObjectHook);
    getLogger(name: string): import("log4js").Logger;
    dispatch(name: string, ...args: any[]): Promise<void>;
    getCommand(name: string): Command<any[], {}>;
    middleware(middleware: Middleware, prepend?: boolean): () => boolean;
    use(middleware: Middleware): this;
    using<T extends PluginManager.PluginHook>(using: readonly (keyof Plugin.Services)[], plugin: T, config?: PluginManager.Option<T>): this;
    addPlugin(plugin: Plugin, config?: any): this;
    plugin(name: string, config?: any): this;
    plugin<T extends PluginManager.PluginHook>(plugin: T, config?: PluginManager.Option<T>): this;
    command<D extends string>(def: D, triggerEvent: keyof EventMap): Command<Action.ArgumentType<D>>;
    execute(session: NSession, content?: string): Promise<boolean | Sendable | void>;
    findCommand(argv: Pick<Action, 'name' | 'source'>): Command<any[], {}>;
    protected _editBotPluginCache(bot: Bot, method: "add" | "delete"): Promise<boolean>;
    install(config?: any): Promise<string>;
    enable(bot?: Bot): Promise<string>;
    disable(bot?: Bot): Promise<string>;
    destroy(plugin?: Plugin): string;
    dispose(): string;
    restart(): Promise<string>;
    name(name: string): this;
    version(version: string): this;
    desc(desc: string): this;
    repo(repoInfo: RepoInfo): this;
    author(authorInfo: AuthorInfo): this;
    toJSON(): {
        disabled: boolean;
        name?: string;
        version?: string;
        description?: string;
        author?: AuthorInfo;
        repository?: RepoInfo;
    };
}
export namespace Plugin {
    interface Services {
        pluginManager: PluginManager;
        bots: BotList;
    }
    const Services: (keyof Services)[];
    function isConstructor(func: Function): boolean;
    function service<K extends keyof Services>(key: K): void;
}
export class PluginManager {
    app: App;
    plugin_dir: string;
    plugins: Map<string, Plugin>;
    constructor(app: App, plugin_dir: string);
    get logger(): import("log4js").Logger;
    getLogger(category: string): import("log4js").Logger;
    init(plugins: Record<string, boolean | Record<string, any>>): Promise<void>;
    import(name: string): Plugin;
    install(plugin: Plugin, config?: any): Promise<string>;
    checkInstall(name: string): Plugin;
    destroy(name: string): Promise<string>;
    restart(name: string): Promise<string>;
    enable(name: string, bot?: Bot): Promise<string>;
    disable(name: string, bot?: Bot): Promise<string>;
    disableAll(bot: Bot): Promise<string>;
    listAll(): {
        disabled: boolean;
        installed: boolean;
        type?: PluginType;
        binds?: number[];
        name?: string;
        version?: string;
        description?: string;
        author?: AuthorInfo;
        repository?: RepoInfo;
    }[];
    list(name?: string): Partial<PluginDesc>[];
    /**
     * 恢复bot的插件服务
     * @param {Bot} bot
     */
    restore(bot: Bot): Promise<Map<string, Plugin>>;
}
export namespace PluginManager {
    const defaultConfig: Config;
    type FunctionHook<T = any> = (parent: Plugin, options: T) => Awaitable<any>;
    type ConstructorHook<T = any> = new (parent: Plugin, options: T) => void;
    type PluginHook = FunctionHook | ObjectHook | ConstructorHook;
    interface ObjectHook<T = any> {
        install: FunctionHook<T> | ConstructorHook<T>;
        name?: string;
        using?: readonly (keyof Plugin.Services)[];
    }
    type Option<T extends PluginHook> = T extends ConstructorHook<infer U> ? U : T extends FunctionHook<infer U> ? U : T extends ObjectHook<infer U> ? U : never;
    interface Config {
        plugin_dir?: string;
        plugins?: Record<string, any>;
    }
}
export abstract class Service {
    protected plugin: Plugin;
    name: keyof Plugin.Services;
    protected start(): Awaitable<void>;
    protected stop(): Awaitable<void>;
    constructor(plugin: Plugin, name: keyof Plugin.Services, immediate?: boolean);
    get caller(): Plugin;
}


// prompt.d.ts


export namespace Prompt {
    export interface Options<T extends keyof TypeKV> {
        type: T | Falsy | PrevCaller<T, T | Falsy>;
        name?: string;
        label?: Sendable;
        message?: Sendable;
        prefix?: string;
        action?: string;
        validate?: RegExp | ((message: string) => boolean);
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
}


// session.d.ts


export interface Session {
    self_id?: number;
    cqCode?: string;
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
export type Computed<T> = T | ((session: NSession) => T);
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
    apply: (this: NSession, suggestion: string) => Awaitable<void | string>;
}
export class Session {
    app: App;
    bot: Bot;
    event_name: keyof EventMap;
    argv: Action;
    parsed?: Parsed;
    constructor(app: App, bot: Bot, data: Dict, event_name: keyof EventMap);
    middleware(middleware: Middleware): () => boolean;
    private promptReal;
    prompt<T extends keyof Prompt.TypeKV>(options: Prompt.Options<T> | Array<Prompt.Options<T>>): Promise<Prompt.Answers<Prompt.ValueType<T>>>;
    executeTemplate(template: string): Promise<Sendable>;
    sendMsg(content: Sendable, channelId?: ChannelId): Promise<MessageRet>;
    getChannelId(): ChannelId;
    getFromUrl(): string;
    resolveValue<T>(source: T | ((session: Session) => T)): T;
    text(path: string | string[], params?: object): string;
    toJSON(...besides: string[]): {
        [k: string]: any;
    };
}

// static.d.ts

export const dir: string;
export const defaultAppConfig: App.Config;
export const defaultBotConfig: Bot.Config;
// types.d.ts

export type Dispose = () => boolean;
type ServiceAction = "load" | 'change' | 'destroy' | 'enable' | 'disable';
type ServiceListener<K extends keyof Plugin.Services = keyof Plugin.Services> = (key: K, service: Plugin.Services[K]) => void;
type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never;
type ServiceEventMap = {
    [P in ServiceAction as `service.${P}`]: ServiceListener;
};
export type TargetType = 'group' | 'private' | 'discuss';
export type ChannelId = `${TargetType}:${number}`;
export type LoginType = 'qrcode' | 'password';
export type Filter = (session: NSession) => boolean;
export type ToSession<A extends any[] = []> = A extends [object, ...infer O] ? Extend<Define<Session, 'args', O>, A[0]> : Define<Session, 'args', A>;
export type NSession<E extends keyof EventMap = 'message'> = ToSession<Parameters<EventMap[E]>>;
export type Middleware = (session: NSession<any>, next?: () => Promise<any>) => Awaitable<boolean | Sendable | void>;
export type MsgChannelId = `${number}-${TargetType}:${number}`;
export type BeforeEventMap = {
    [E in keyof AppEventMap & string as OmitSubstring<E, 'before-'>]: AppEventMap[E];
};
export interface AppEventMap extends BotEventMap, ServiceEventMap {
    'ready'(): void;
    'dispose'(): void;
    'send'(messageRet: MessageRet, channelId: ChannelId): void;
    'continue'(session: NSession): Promise<string | boolean | void>;
    'attach'(session: NSession): Awaitable<void | string>;
    'bot-add'(bot: Bot): void;
    'bot-remove'(bot: Bot): void;
    'command-add'(command: Command): void;
    'command-remove'(command: Command): void;
    'plugin-add'(plugin: Plugin): void;
    'plugin-enable'(plugin: Plugin): void;
    'plugin-disable'(plugin: Plugin): void;
    'plugin-remove'(plugin: Plugin): void;
}
