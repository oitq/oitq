import * as path from "path";
import * as fs from "fs";
import * as zlib from 'zlib'
import * as vm from 'vm'
import {segment} from "oicq";

const dataPath = path.join(__dirname, "./")
const contextFile = path.join(dataPath, "context")
const fnFile = path.join(dataPath, "context.fn")
const initCodeFile = path.join(__dirname, "sandbox.code.js")
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, {recursive: true, mode: 0o700})
}
let context:Record<string, any>={}
export interface Config{
    timeout?:number
}
export class Sandbox {
    set_env_allowed = false
    init_finished = false
    private timeout: number
    private context: Record<string, any> = new Proxy(context, {
        set(o, k, v) {
            if (!this.init_finished)
                return Reflect.set(o, k, v)
            if (k === "set_history_allowed")
                return false
            if (k === "data" && !this.set_env_allowed)
                return false
            if (o.isProtected(k) && !o.isMaster())
                return false
            if (typeof o.recordSetHistory === "function") {
                o.set_history_allowed = true
                o.recordSetHistory(k)
                o.set_history_allowed = false
            }
            return Reflect.set(o, k, v)
        },
        defineProperty: (o, k, d) => {
            if (!this.init_finished || o.isMaster())
                return Reflect.defineProperty(o, k, d)
            else
                return false
        },
        deleteProperty: (o, k) => {
            if (!this.init_finished || o.isMaster() || !o.isProtected(k))
                return Reflect.deleteProperty(o, k)
            else
                return false
        },
        preventExtensions: (o) => {
            return false
        },
        setPrototypeOf: (o, prototype) => {
            return false
        }
    })

    constructor(master: number, config:Config={} ) {
        vm.createContext(this.context, {
            codeGeneration: {
                strings: false,
                wasm: false
            },
            microtaskMode: "afterEvaluate"
        })
        this.timeout = config.timeout || 500
        this.restore()
        this.init()
        this.runInContext(`Object.defineProperty(this, "root", {
            configurable: false,
            enumerable: false,
            writable: false,
            value: "${master}"
        })`)
        this.freeze()
        this.init_finished = true
        this.runInContext(`try{this.afterInit()}catch(e){}`)
        this.startSaveFn()
        this.getContext().cheerio = require("cheerio") //临时对应
        this.include("moment", require("moment"))
        this.include("assert", require("assert"))
        this.include("crypto", require("crypto"))
        this.include("querystring", require("querystring"))
        this.include("path", require("path"))
        this.include("zip", require("zlib").deflateSync)
        this.include("unzip", require("zlib").unzipSync)
        this.include("os", require("os"))
        this.include("Buffer", Buffer)
        this.include('segment',segment)
    }

    getTimeout() {
        return this.timeout
    }

    setTimeout(t: number) {
        this.timeout = t
    }

    private init() {
        //执行init代码
        this.runInContext(fs.readFileSync(initCodeFile) as unknown as string)
    }

    private freeze() {
        this.freezeBuittin()
    }

    //冻结内置对象(不包括console,globalThis)
    private freezeBuittin() {
        const internal_properties = [
            'Object', 'Function', 'Array',
            'Number', 'parseFloat', 'parseInt',
            'Boolean', 'String', 'Symbol',
            'Date', 'RegExp', 'eval',
            'Error', 'EvalError', 'RangeError',
            'ReferenceError', 'SyntaxError', 'TypeError',
            'URIError', 'JSON', 'Promise',
            'Math', 'Intl',
            'ArrayBuffer', 'Uint8Array', 'Int8Array',
            'Uint16Array', 'Int16Array', 'Uint32Array',
            'Int32Array', 'Float32Array', 'Float64Array',
            'Uint8ClampedArray', 'BigUint64Array', 'BigInt64Array',
            'DataView', 'Map', 'BigInt',
            'Set', 'WeakMap', 'WeakSet',
            'Proxy', 'Reflect', 'decodeURI',
            'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
            'escape', 'unescape',
            'isFinite', 'isNaN', 'SharedArrayBuffer',
            'Atomics', 'WebAssembly'
        ]
        for (let v of internal_properties) {
            this.runInContext(`this.Object.freeze(this.${v})
            this.Object.freeze(this.${v}.prototype)
            const ${v} = this.${v}`)
        }
    }

    private restore() {
        //还原context中的函数
        if (fs.existsSync(fnFile)) {
            let fn = JSON.parse(zlib.brotliDecompressSync(fs.readFileSync(fnFile)) as unknown as string)
            const restoreFunctions = (o, name) => {
                for (let k in o) {
                    let key = name + `["${k}"]`
                    if (typeof o[k] === "string") {
                        try {
                            vm.runInContext(`${key}=` + o[k], this.context)
                        } catch (e) {
                        }
                    } else if (typeof o[k] === "object") {
                        restoreFunctions(o[k], key)
                    }
                }
            }
            restoreFunctions(fn, "this")
        }
    }

    startSaveFn() {
        let fn
        const saveFunctions = (o, mp) => {
            for (let k in o) {
                if (typeof o[k] === "function") {
                    mp[k] = o[k] + ""
                } else if (typeof o[k] === "object" && o[k] !== null) {
                    if (o === this.context) {
                        try {
                            if (JSON.stringify(o[k]).length > 10485760)
                                o[k] = undefined
                        } catch (e) {
                            o[k] = undefined
                        }
                    }
                    if (o[k] === undefined)
                        continue
                    mp[k] = {}
                    saveFunctions(o[k], mp[k])
                } else if (typeof o[k] === "bigint") {
                    o[k] = Number(o[k])
                }
            }
        }
        const beforeSaveContext = () => {
            this.setEnv()
            fn = {}
            saveFunctions(this.context, fn)
        }
        const brotli_options = {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 5
            }
        }
        process.on("exit", (code) => {
            // if (code !== 200)
            //     return
            beforeSaveContext()
            fs.writeFileSync(fnFile, zlib.brotliCompressSync(JSON.stringify(fn), brotli_options), 'utf-8')
            fs.writeFileSync(contextFile, zlib.brotliCompressSync(JSON.stringify(this.context), brotli_options), 'utf-8')
        })
        setInterval(() => {
            beforeSaveContext()
            zlib.brotliCompress(
                JSON.stringify(fn),
                brotli_options,
                (err, res) => {
                    if (res)
                        fs.writeFile(fnFile, res, 'utf-8', () => {
                        })
                }
            )
            zlib.brotliCompress(
                JSON.stringify(this.context),
                brotli_options,
                (err, res) => {
                    if (res)
                        fs.writeFile(contextFile, res, 'utf-8', () => {
                        })
                }
            )
        }, 3600000)

    }

    include(key: string, value: any) {
        this.context[key] = value
        this.runInContext(`const ${key} = this.${key}
        contextify(${key})`)
    }

    setEnv(env = {}) {
        this.set_env_allowed = true
        this.runInContext(`this.data=${JSON.stringify(env)}
        contextify(this.data)`)
        this.set_env_allowed = false
    }
    getContext(){
        return this.context
    }
    private runInContext(code: string, options?: string | vm.RunningScriptOptions) {
        return vm.runInContext(code, this.context, options)
    }
    exec(code:string){
        return this.runInContext(code)
    }
    run(code: string) {
        let debug = ["\\", "＼"].includes(code.substr(0, 1))
        if (debug)
            code = code.substr(1)
        let [fn, ...args] = code.split(' ')
        let isFn = false
        if (fn.startsWith('$')) {
            fn = fn.replace('$', '')
            isFn = true
        }
        if (this.context[fn] && typeof this.context[fn] === 'function') {
            if (args.length) {
                code = `${fn}(${args.join()})`
            }
            if (isFn) {
                code = `${fn}()`
            }
        }
        code = code.trim()
        try {
            let code2 = this.runInContext(`this.beforeExec(${JSON.stringify(code)})`, {timeout: this.timeout})
            if (typeof code2 === "string")
                code = code2
            let res = this.runInContext(code, {timeout: this.timeout})
            if (res instanceof this.runInContext("Promise"))
                res = undefined
            this.context._current_echo = res
            let res2 = this.runInContext(`this.afterExec()`, {timeout: this.timeout})
            if (typeof res2 !== "undefined")
                res = res2
            return res
        } catch (e) {
            if (debug) {
                return e.name + ": " + e.message
            }
        }
    }
}
