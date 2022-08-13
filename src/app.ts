import * as path from "path";
import * as fs from 'fs'
import {default as Yaml} from 'js-yaml'
import {Logger, getLogger} from "log4js";
import {Awaitable, LogLevel, Middleware, NSession, OitqEventMap} from "./types";
import ConfigLoader from "./configLoader";
import {deepClone, deepMerge, remove, wrapExport} from "./utils";
import {Event} from "./event";
import {Plugin} from "./plugin";
import {Adapter, BotEventMap} from "./adapter";
import {Service} from "./service";
import {Command} from "./command";
import {Argv} from "./argv";
import {ChildProcess, fork} from 'child_process'
import {join, resolve} from "path";
import Koa from "koa";
import {Router} from "./services/http/router";
import {Server} from "http";

declare global {
    var __OITQ__: App
}

export class App extends Event {
    public config: App.Config
    public started: boolean
    public services: Record<string, Service>
    public adapters: Record<string, Adapter>
    public plugins: Record<string, Plugin>
    pluginGroup:Map<string,Plugin[]>=new Map<string, Plugin[]>()
    middlewares: Middleware[] = []
    public logger: Logger

    constructor(config: App.Config) {
        super()
        this.plugins = {}
        this.services = {}
        this.adapters = {}
        this.pluginGroup.set('default',[])
        this.config = deepMerge(deepClone(App.defaultConfig), config)
        this.logger = getLogger(`[Oitq]`)
        this.logger.level = this.config.logLevel;
        this.on('message', async (session: NSession<BotEventMap, App.MessageEvent>) => {
            await this.parallel('attach',session)
            for (const middleware of this.middlewares) {
                let result = await middleware(session)
                if (result) {
                    if (typeof result !== 'boolean') {
                        session.sendMsg(result)
                    }
                    return
                }
            }
        })
    }

    get commandList(): Command[] {
        return Object.values(this.plugins).map(plugin => plugin.commandList).flat()
    }

    get bots() {
        return Object.values(this.adapters).map(adapter => adapter.bots).flat()
    }

    findPlugin(filter: (plugin: Plugin) => boolean) {
        return Object.values(this.plugins).find(filter)
    }

    findAdapter(filter: (plugin: Adapter) => boolean) {
        return Object.values(this.adapters).find(filter)
    }

    findService(filter: (plugin: Service) => boolean) {
        return Object.values(this.services).find(filter)
    }
    middleware(middleware:Middleware,prepend?:boolean){
        const method=prepend?'push':'unshift'
        this.middlewares[method](middleware)
        return ()=>{
            remove(this.middlewares,middleware)
        }
    }
    dispose() {
        this.emit('dispose')
        for (const plugin of Object.values(this.plugins)) {
            plugin.dispose()
        }
        this.started = false
    }

    findCommand(argv: Argv) {
        return this.commandList.find(cmd => {
            return cmd.name === argv.name
                || cmd.aliasNames.includes(argv.name)
                || cmd.shortcuts.some(({name}) => typeof name === 'string' ? name === argv.name : name.test(argv.source))
        })
    }

    getLogger(category: string) {
        const logger = getLogger(`[Oitq:${category}]`)
        logger.level = this.config.logLevel
        return logger
    }

    use(middleware: Middleware, prepend?: boolean): this {
        this.middleware(middleware,prepend)
        return this
    }

    init() {
        this.initAdapters()
        this.initServices()
        this.initPlugins()
    }
    public async bail<K extends keyof OitqEventMap>(name: K, ...args){
        let result=await super.bail(name,...args)
        if(result) return result
        for(const adapter of Object.values(this.adapters)){
            result=await adapter.bail(name,...args)
            if(result) return result
        }
        for(const service of Object.values(this.services)){
            result=await service.bail(name,...args)
            if(result) return result
        }
        for(const plugin of Object.values(this.plugins)){
            result=await plugin.bail(name,...args)
            if(result) return result
        }

    }
    public async parallel<K extends keyof OitqEventMap>(name: K, ...args): Promise<void> {
        await super.parallel(name,...args)
        for(const adapter of Object.values(this.adapters)){
            await adapter.parallel(name,...args)
        }
        for(const service of Object.values(this.services)){
            await service.parallel(name,...args)
        }
        for(const plugin of Object.values(this.plugins)){
            await plugin.parallel(name,...args)
        }
    }

    private initAdapters() {
        for (let name of Object.keys(this.config.adapters)) {
            const options=this.load(name, 'adapter')
            if(typeof options.install==='function'){
                const adapter=new Adapter(name,options.fullPath)
                options.install(adapter,this.config.adapters[name])
            }
        }
    }


    private initServices() {
        for (let name of Object.keys(this.config.services)) {
            const options=this.load(name, 'service')
            if(typeof options.install==='function'){
                const service=new Service(name,options.fullPath)
                options.install(service,this.config.services[name])
            }
        }
    }
    private initPlugins() {
        for (let name of Object.keys(this.config.plugins)) {
            const options=this.load(name, 'plugin')
            if(typeof options.install==='function'){
                const plugin=new Plugin(name,options.fullPath)
                options.install(plugin,this.config.plugins[name])
            }
        }
    }

    public load(name: string, type: 'service' | 'plugin' | 'adapter') {
        function getFullPath(tempPath:string){
            const extensions=['ts','js','mjs','cjs']
            for(const extension of extensions){
                const realPath=`${tempPath}.${extension}`
                if(fs.existsSync(realPath)) return realPath
            }
            return tempPath
        }
        let resolved
        const orgModule = `@oitq/${type}-${name}`
        const comModule = `oitq-${type}-${name}`
        const builtModule = path.join(__dirname, `${type}s`, name)
        let customModule
        if (this.config[`${type}_dir`]) customModule = path.resolve(this.config[`${type}_dir`], name)
        if (customModule) {
            try {
                require.resolve(customModule)
                resolved = customModule
            } catch {
            }
        }
        if (!resolved) {
            try {
                require.resolve(builtModule)
                resolved = `${__dirname}/${type}s/${name}`
            } catch {
            }
        }
        if (!resolved) {
            try {
                require.resolve(orgModule)
                resolved = path.resolve(process.cwd(),'node_modules',`@oitq/${type}-${name}`)
            } catch {
            }
        }
        if (!resolved) {
            try {
                require.resolve(comModule)
                resolved = path.resolve(process.cwd(),'node_modules',`oitq-${type}-${name}`)
            } catch {
            }
        }

        if (!resolved) throw new Error(`未找到${type}(${name})`)
        const result=wrapExport(resolved)
        this.logger.info(`${type}(${name}) 已加载`)
        return {
            install:result.install||result,
            name:result.name||name,
            fullPath:getFullPath(resolved)
        }
    }
    unload(name: string, type: 'service' | 'plugin' | 'adapter'){
        const item=this[`${type}s`][name]
        if(item) {
            item.dispose()
            item.emit('dispose')
            item.dependencies.forEach(filePath=>{
                delete require.cache[filePath]
            })
        }
    }
    async start() {
        this.init()
        this.started = true
        await this.parallel('before-start')
        await this.parallel('start')
        await this.parallel('ready')
    }
}

export function start(config: App.Config | string = path.join(process.cwd(), 'oitq.yaml')) {
    if (typeof config === 'string') return App.start(config)
    const configPath = App.writeConfig(config)
    console.log('已将配置保存到' + configPath)
    App.start(configPath)
}

export function defineConfig(config: App.Config) {
    return config
}
export interface App extends App.Services{

}
export namespace App {
    export type MessageEvent = 'oicq.message'
    export interface Services{
        koa:Koa
        router:Router
        server:Server
    }
    const event=['bot','command','plugin']
        .map(type=>['add','remove']
            .map(event=>`${type}-${event}`))
        .flat()
    const lifeCycle=['plugin','service','adapter']
        .map(type=>['start','dispose']
            .map(event=>`${type}.${event}`))
        .flat()
    export const metaEvent =event.concat(lifeCycle)

    export function start(configPath: string) {
        return createWorker(configPath)
    }

    export interface Config<S extends keyof Service.Config=keyof Service.Config,P extends keyof Plugin.Config=keyof Plugin.Config,A extends keyof Adapter.Config=keyof Adapter.Config> {
        services?: Partial<Record<S, Service.Config[S]>>
        plugins?: Partial<Record<P, Plugin.Config[P]>>
        adapters?: Partial<Record<A, Adapter.Config[A]>>
        delay?:Record<string, number>
        plugin_dir?: string
        service_dir?: string
        adapter_dir?: string
        logLevel?: LogLevel
    }

    export const defaultConfig: Config = {
        logLevel: 'info',
        services: {},
        delay:{
            prompt:60000
        },
        plugins: {
            commandParser: true,
        },
        adapters: {}
    }

    export function readConfig(dir = join(process.cwd(), 'oitq.yaml')) {
        if (!fs.existsSync(dir)) {
            fs.writeFileSync(dir, dir.endsWith('ml')?Yaml.dump(defaultConfig):JSON.stringify(defaultConfig), 'utf-8')
            console.log('未找到配置文件，已创建默认配置文件，请修改后重新启动')
            process.exit()
        }
        return deepMerge(deepClone(defaultConfig),new ConfigLoader<App.Config>(dir).readConfig())
    }

    export function writeConfig(config: App.Config, dir = join(process.cwd(), 'oitq.yaml')) {
        fs.writeFileSync(dir, dir.endsWith('ml')?Yaml.dump(config):JSON.stringify(config), 'utf-8')
        return dir
    }
}
let cp: ChildProcess
process.on('SIGINT', () => {
    if (cp) {
        cp.emit('SIGINT')
    } else {
        process.exit()
    }
})

interface Message {
    type: 'start' | 'queue'
    body: any
}

let buffer = null

export function createWorker(configPath) {
    cp = fork(resolve(__dirname, 'worker'), [], {
        env: {
            configPath
        },
        execArgv: [
            '-r', 'esbuild-register',
            '-r', 'tsconfig-paths/register'
        ]
    })
    let config: { autoRestart: boolean }
    cp.on('message', (message: Message) => {
        if (message.type === 'start') {
            config = message.body
            if (buffer) {
                cp.send({type: 'send', body: buffer})
                buffer = null
            }
        } else if (message.type === 'queue') {
            buffer = message.body
        }
    })
    const closingCode = [0, 130, 137]
    cp.on('exit', (code) => {
        if (!config || closingCode.includes(code) || code !== 51 && !config.autoRestart) {
            process.exit(code)
        }
        createWorker(configPath)
    })
}

