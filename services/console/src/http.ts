import { Plugin, Dict, noop,Random } from 'oitq'
import { dirname, extname, resolve } from 'path'
import { createReadStream, existsSync, promises as fsp, Stats } from 'fs'
import {createServer} from "vite";
import vuePlugin from "@vitejs/plugin-vue";
import { DataService } from './service'
import { ViteDevServer } from 'vite'
import {} from '@oitq/service-http-server'
import koaConnect from 'koa-connect'
import open from 'open'

export interface Entry {
    dev: string
    prod: string
}

class HttpService extends DataService<string[]> {
    private vite: ViteDevServer
    private data: Dict<string> = {}
    root:string
    private isStarted:boolean=false

    constructor(plugin: Plugin, private config: HttpService.Config) {
        super(plugin, 'http')

        this.root=config.root?config.root: config.devMode
            ? resolve(dirname(require.resolve('@oitq/client/package.json')), 'app')
            : resolve(__dirname, '../dist')
    }

    async start() {
        if(this.isStarted)return
        if (!this.root) return
        if (this.config.devMode) await this.createVite()
        this.serveAssets()
        if (this.config.open) {
            const { port } = this.plugin.app.config
            open(`http://localhost:${port}${this.config.uiPath}`)
        }
        this.isStarted=true
    }

    private resolveEntry(entry: string | Entry) {
        if (typeof entry === 'string') return entry
        if (!this.config.devMode) return entry.prod
        if (!existsSync(entry.dev)) return entry.prod
        return entry.dev
    }

    addEntry(entry: string | Entry) {
        const key = 'extension-' + Random.id()
        this.data[key] = this.resolveEntry(entry)
        this.refresh()
        this.caller?.on('dispose', () => {
            delete this.data[key]
            this.refresh()
        })
    }

    get() {
        const { devMode, uiPath } = this.config
        const filenames: string[] = []
        for (const key in this.data) {
            const local = this.data[key]
            const filename = devMode ? '/vite/@fs/' + local : uiPath + '/' + key
            if (extname(local)) {
                filenames.push(filename)
            } else {
                filenames.push(filename + '/index.js')
                if (existsSync(local + '/style.css')) {
                    filenames.push(filename + '/style.css')
                }
            }
        }
        return filenames
    }

    private serveAssets() {
        const { uiPath } = this.config
        const {root}=this
        this.plugin.router.get(uiPath + '(/.+)*', async (ctx, next) => {
            // add trailing slash and redirect
            if (ctx.path === uiPath && !uiPath.endsWith('/')) {
                return ctx.redirect(ctx.path + '/')
            }
            const name = ctx.path.slice(uiPath.length).replace(/^\/+/, '')
            const sendFile = (filename: string) => {
                ctx.type = extname(filename)
                return ctx.body = createReadStream(filename)
            }
            if (name.startsWith('extension-')) {
                const key = name.slice(0, 18)
                if (this.data[key]) return sendFile(this.data[key] + name.slice(18))
            }
            const filename = resolve(root, name)
            if (!filename.startsWith(root) && !filename.includes('node_modules')) {
                return ctx.status = 403
            }
            const stats = await fsp.stat(filename).catch<Stats>(noop)
            if (stats?.isFile()) return sendFile(filename)
            const ext = extname(filename)
            if (ext && ext !== '.html') return next()
            const template = await fsp.readFile(resolve(root, 'index.html'), 'utf8')
            ctx.type = 'html'
            ctx.body = await this.transformHtml(template)
        })
    }

    private async transformHtml(template: string) {
        const { uiPath } = this.config
        if (this.vite) {
            template = await this.vite.transformIndexHtml(uiPath, template)
        } else {
            template = template.replace(/(href|src)="(?=\/)/g, (_, $1) => `${$1}="${uiPath}`)
        }
        const headInjection = `<script>oitq_config = ${JSON.stringify(this.plugin.console.global)}</script>`
        return template.replace('</title>', '</title>' + headInjection)
    }

    private async createVite() {
        const { root } = this
        this.vite = await createServer({
            root,
            base:'/vite/',
            server: {
                middlewareMode: true,
            },
            plugins: [vuePlugin()],
            resolve: {
                dedupe: ['vue'],
                alias: {
                    '../vue.js': 'vue',
                    '../vue-router.js': 'vue-router',
                    '../vueuse.js': '@vueuse/core',
                },
            },
            optimizeDeps: {
                include: [
                    'element-plus',
                ],
            },
            build: {
                rollupOptions: {
                    input: this.root + '/index.html',
                },
            },
        })

        this.plugin.router.get('/vite(/.+)*', koaConnect(this.vite.middlewares))
        this.plugin.on('dispose', () => this.vite.close())
    }
}

namespace HttpService {
    export interface Config {
        root?: string
        uiPath?: string
        devMode?: boolean
        open?: boolean
    }
}

export default HttpService
