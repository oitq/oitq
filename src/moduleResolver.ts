import * as os from "os"
import * as path from "path"
import * as ts from "typescript"
import * as crypto from 'crypto'
import {ScriptTarget, ModuleKind, ModuleResolutionKind} from 'typescript'
import * as process from 'process'
import {dirname} from "path";
export class ModuleResolver {
    private readonly outputPath: string
    private readonly callerStrIndex: number = 5
    private readonly TS_EXT: string = '.ts'
    private readonly JS_EXT: string = '.js'
    private readonly id: string
    private filename: string

    constructor(id: string) {
        this.id = id
        const outputDirname: string = `.${crypto.createHash('md5').update(`${Date.now()}-${Math.floor(Math.random()*65535)}`).digest('hex')}`
        this.outputPath = path.resolve(dirname(id), outputDirname)
    }

    private getCallerDirname(): string {
        const stackStr: string = new Error('Caller').stack
        const callerLineStr: string = stackStr.split(os.EOL)[this.callerStrIndex].trim()
        const callerFilePath: string = callerLineStr.split('(')[1].split(')')[0].split(':')[0]
        return path.dirname(callerFilePath)
    }

    public resolveModule(): string {
        if (this.filename) return this.filename
        const moduleFullPath: string = require.resolve(this.id)
        const extension: string = path.extname(moduleFullPath)
        switch (extension) {
            case this.TS_EXT: {
                const _filename: string = `${path.basename(moduleFullPath).split(extension)[0]}${this.JS_EXT}`
                const program = ts.createProgram([moduleFullPath], {
                    inlineSourceMap: true,
                    sourceMap: true,
                    inlineSources: true,
                    target: ScriptTarget.ESNext,
                    module: ModuleKind.CommonJS,
                    outDir: this.outputPath,
                    moduleResolution: ModuleResolutionKind.NodeJs,
                    removeComments: false,
                    strict: false,
                    esModuleInterop: true,
                    experimentalDecorators: true,
                    emitDecoratorMetadata: true,
                    pretty: true,
                    allowJs: true
                })
                program.emit()
                this.filename = path.resolve(this.outputPath, _filename)
            }
                break
            case this.JS_EXT: {
                this.filename = moduleFullPath
            }
                break
            default: {
                throw new Error(`Invalid extension [${extension}]`)
            }
        }
        return this.filename
    }
}
