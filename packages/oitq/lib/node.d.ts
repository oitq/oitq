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
declare module 'oitq'{
    // app.d.ts
    import { LogLevel, Sendable } from "oicq";
    import { BotList, Bot } from "./bot";
    import { Dict, Awaitable } from "@oitq/utils";
    import { MsgChannelId } from './context';
    import { Plugin, PluginManager } from './plugin';
    import { Computed } from "./session";
    import { Middleware } from "./middleware";
    export namespace App {
        interface Config extends PluginManager.Config {
            start?: boolean;
            prefix?: Computed<string | string[]>;
            minSimilarity?: number;
            bots?: Bot.Config[];
            plugins?:Record<string, any>
            delay?: Dict<number>;
            token?: string;
            dir?: string;
            logLevel?: LogLevel;
            maxListeners?: number;
        }
        interface Services {
            pluginManager: PluginManager;
            bots: BotList;
        }
    }
    export interface App extends App.Services {
        start(...args: any[]): Awaitable<void>;
    }
    export class App extends Plugin {
        app: this;
        middlewares: Middleware[];
        config: App.Config;
        constructor(config?: App.Config | string);
        broadcast(msgChannelIds: MsgChannelId | MsgChannelId[], msg: Sendable): Promise<void>;
        addBot(config: Bot.Config): Bot;
        removeBot(uin: number): boolean;
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
        session?: NSession<'message'>;
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
        }
        type DomainType = keyof Domain;
        type ParamType<S extends string, F> = S extends `${any}:${infer T}` ? T extends DomainType ? Domain[T] : F : F;
        export type Replace<S extends string, X extends string, Y extends string> = S extends `${infer L}${X}${infer R}` ? `${L}${Y}${Replace<R, X, Y>}` : S;
        type ExtractAll<S extends string, F> = S extends `${infer L}]${infer R}` ? [ParamType<L, F>, ...ExtractAll<R, F>] : [];
        export type ExtractFirst<S extends string, F> = S extends `${infer L}]${any}` ? ParamType<L, F> : boolean;
        type ExtractSpread<S extends string> = S extends `${infer L}...${infer R}` ? [...ExtractAll<L, string>, ...ExtractFirst<R, string>[]] : [...ExtractAll<S, string>, ...string[]];
        export type ArgumentType<S extends string> = ExtractSpread<Replace<S, '>', ']'>>;
        export type OptionType<S extends string> = ExtractFirst<Replace<S, '>', ']'>, any>;
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
    export type TargetType = 'group' | 'private' | 'discuss';
    export type ChannelId = `${TargetType}:${number}`;
    export type LoginType = 'qrcode' | 'password';
    export type ToSession<A extends any[] = []> = A extends [object, ...infer O] ? Extend<Define<Session, 'args', O>, A[0]> : Define<Session, 'args', A>;
    export type NSession<E extends keyof EventMap> = ToSession<Parameters<EventMap[E]>>;
    type Transform = {
        [P in keyof EventMap as `bot.${P}`]: (session: NSession<P>) => void;
    };
    export interface BotEventMap extends Transform, EventMap {
        'bot.add'(bot: Bot): void;
        'bot.remove'(bot: Bot): void;
    }
    export class Bot extends Client {
        app: App;
        options:Bot.Config;
        private _nameRE;
        admins: number[];
        master: number;
        constructor(app: App, options: Bot.Config);
        isMaster(user_id: number): boolean;
        isAdmin(user_id: number): boolean;
        emit<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>): boolean;
        createSession<E extends keyof EventMap>(name: E, ...args: Parameters<EventMap[E]>): ToSession<Parameters<EventMap<any>[E]>>;
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
            type: LoginType;
            password?: string;
            nickname?: string | string[];
            prefix?: string | string[];
            master?: number;
            admins?: number[];
            parent?: number;
        }
    }
    export class BotList extends Array<Bot> {
        app: App;
        constructor(app: App);
        get(uin: number): Bot;
        create(options: Bot.Config): Bot;
        remove(uin: number): boolean;
    }
    // command.d.ts

    export class Command<A extends any[] = any[], O extends {} = {}> {
        plugin: Plugin;
        triggerEvent: keyof EventMap;
        name: string;
        args: Action.Declaration[];
        parent: Command;
        children: Command[];
        private authority;
        descriptions: string[];
        shortcuts: Command.Shortcut[];
        private checkers;
        private actions;
        examples: string[];
        aliasNames: string[];
        options: Record<string, Command.OptionConfig>;
        constructor(declaration: string, plugin: Plugin, triggerEvent: keyof EventMap);
        auth(authority: number): void;
        desc(desc: string): this;
        check(checker: Command.Callback<A, O>): this;
        example(example: string): this;
        match(session: NSession<'message'>): boolean;
        alias(...name: string[]): this;
        use(callback: (cmd: Command) => any): void;
        shortcut(reg: RegExp | string, config?: Command.Shortcut): this;
        subcommand<D extends string>(def: D, triggerEvent: keyof EventMap): Command<Action.ArgumentType<D>>;
        option<K extends string, D extends string>(name: K, declaration: D, config?: Command.OptionConfig): Command<A, Define<O, K, Command.OptionType<D>>>;
        action(action: Command.Callback<A, O>): this;
        parse(action: Action<A, O>, args?: any[], options?: {}): void;
        execute(action: Action<A, O>): Awaitable<boolean | Sendable | void>;
    }
    export namespace Command {
        interface Shortcut {
            name?: string | RegExp;
            fuzzy?: boolean;
            args?: string[];
            option?: Record<string, any>;
        }
        interface OptionConfig<T extends Action.Type = Action.Type> {
            value?: any;
            initial?: any;
            name?: string;
            fullName?: string;
            type?: T;
            /** hide the option by default */
            hidden?: boolean;
            description?: string;
            declaration?: Action.Declaration;
        }
        type Callback<A extends any[] = any[], O extends {} = {}> = (action: Action<A, O>, ...args: A) => Sendable | void | Promise<Sendable | void>;
        type OptionType<S extends string> = Action.ExtractFirst<Action.Replace<S, '>', ']'>, any>;
        function removeDeclarationArgs(name: string): string;
        function findDeclarationArgs(declaration: string): Action.Declaration[];
    }

    // context.d.ts

    type ServiceAction = "load" | 'change' | 'destroy' | 'enable' | 'disable';
    type ServiceListener<K extends keyof App.Services = keyof App.Services> = (key: K, service: App.Services[K]) => void;
    type ServiceEventMap = {
        [P in ServiceAction as `service.${P}`]: ServiceListener;
    };
    export interface AppEventMap extends BotEventMap, ServiceEventMap {
        'start'(): void;
        'stop'(): void;
        'command.execute.before'(argv: Action): Awaitable<void | string>;
        'command.execute.after'(argv: Action): Awaitable<void | string>;
        'bot.add'(bot: Bot): void;
        'bot.remove'(bot: Bot): void;
        'plugin.install'(plugin: Plugin): void;
        'plugin.enable'(plugin: Plugin): void;
        'plugin.disable'(plugin: Plugin): void;
        'plugin.destroy'(plugin: Plugin): void;
    }
    export type Dispose = () => boolean;
    export type MsgChannelId = `${number}-${TargetType}:${number}`;
    export interface Context {
        on<E extends keyof AppEventMap>(name: E, listener: AppEventMap[E], prepend?: boolean): Dispose;
        on<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, listener: (...args: any) => void, prepend?: boolean): Dispose;
        before<E extends keyof AppEventMap>(name: E, listener: AppEventMap[E], append?: boolean): Dispose;
        before<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, listener: (...args: any) => void, append?: boolean): Dispose;
        once<E extends keyof AppEventMap>(name: E, listener: AppEventMap[E], prepend?: boolean): Dispose;
        once<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, listener: (...args: any) => void, prepend?: boolean): Dispose;
        addEventListener<E extends keyof AppEventMap>(name: E, listener: AppEventMap[E], prepend?: boolean): Dispose;
        addEventListener<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, listener: (...args: any) => void, prepend?: boolean): Dispose;
        emit<E extends keyof AppEventMap>(name: E, ...args: Parameters<AppEventMap[E]>): boolean;
        emit<S extends string | symbol>(name: S & Exclude<S, keyof AppEventMap>, ...args: any[]): boolean;
    }
    export class Context extends EventFeeder {
        app: App;
        constructor();
        middleware(middleware: Middleware, prepend?: boolean): () => boolean;
        getLogger(name: string): import("log4js").Logger;
    }
    // event.d.ts
    export type EventName = string;
    export type EventListener = (...args: any[]) => Awaitable<any>;
    export class EventFeeder {
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
        on<K extends EventName>(name: K, listener: (...args: any[]) => void, prepend?: boolean): () => boolean;
        before<K extends string>(name: K, listener: (...args: any) => void): () => boolean;
        off<K extends EventName>(name: K, listener: (...args: any[]) => void): boolean;
    }
    // middleware.d.ts
    export type Middleware = (session: NSession<'message'>) => Awaitable<boolean | Sendable | void>;
    // plugin.d.ts

    export enum PluginType {
        Builtin = "builtin",
        Official = "official",
        Community = "community",
        Custom = "custom"
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
    export class Plugin extends Context {
        readonly name: string;
        readonly fullpath: string;
        readonly path: string;
        protected hooks: PluginManager.Object;
        parent: Plugin;
        children: Plugin[];
        private _commands;
        disposes: Dispose[];
        commandList: Command[];
        readonly binds: Set<Bot>;
        private _using;
        config: any;
        pluginManager: PluginManager;
        constructor(name: string, hooks: string | PluginManager.Object);
        executeCommand(session: NSession<'message'>, content?: string): Promise<boolean | Sendable | void>;
        findCommand(argv: Pick<Action, 'name' | 'source'>, commandList?: Command[]): Command<any[], {}>;
        private dispatch;
        get commands(): Command[];
        getCommand(name: string): Command<any[], {}>;
        using<T extends PluginManager.Plugin>(using: readonly (keyof App.Services)[], plugin: T, config?: PluginManager.Option<T>): this;
        plugin(name: string, config?: any): this;
        plugin<T extends PluginManager.Plugin>(plugin: T, config?: PluginManager.Option<T>): this;
        command<D extends string>(def: D, triggerEvent: keyof EventMap): Command<Action.ArgumentType<D>>;
        protected _editBotPluginCache(bot: Bot, method: "add" | "delete"): Promise<boolean>;
        install(config?: any): Promise<void>;
        enable(bot: Bot): Promise<void>;
        disable(bot: Bot): Promise<void>;
        destroy(): Promise<void>;
        dispose(): void;
        restart(): Promise<void>;
    }
    export class PluginManager {
        app: App;
        plugin_dir: string;
        plugins: Map<string, Plugin>;
        constructor(app: App, plugin_dir: string);
        get logger(): import("log4js").Logger;
        getLogger(category: string): import("log4js").Logger;
        init(plugins: Record<string, boolean | Record<string, any>>): void;
        import(name: string): Plugin;
        install(plugin: Plugin, config?: any): void;
        checkInstall(name: string): Plugin;
        destroy(name: string): Promise<void>;
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
        type Function<T = any> = (app: App, config: T) => Awaitable<any>;
        interface Object<T = any> {
            install: Function<T>;
            using?: readonly (keyof App.Services)[];
            name?: string;
            author?: string;
        }
        type Option<T extends Plugin> = T extends Function<infer U> ? U : T extends Object<infer U> ? U : never;
        interface Config {
            plugin_dir?: string;
            plugins?: Record<string, any>;
        }
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
        export {};
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
        event_name: keyof EventMap;
        argv: Action;
        parsed?: Parsed;
        constructor(app: App, bot: Bot, data: Dict, event_name: keyof EventMap);
        middleware(middleware: Middleware): () => boolean;
        private promptReal;
        prompt<T extends keyof Prompt.TypeKV>(options: Prompt.Options<T> | Array<Prompt.Options<T>>): Promise<Prompt.Answers<Prompt.ValueType<T>>>;
        executeTemplate(template: string): Promise<boolean | void | Sendable>;
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
}
