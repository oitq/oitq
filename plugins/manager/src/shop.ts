import { Plugin, Dict, pick } from 'oitq'
import {Requester} from "@oitq/plugin-utils";
import { DataService } from '@oitq/plugin-console'
import scan, {AnalyzedPackage, PackageJson, Registry, RemotePackage} from '@oitq/shop'
import which from 'which-pm-runs'
import spawn from 'cross-spawn'
import { loadManifest } from './utils'

class ShopProvider extends DataService<Dict<ShopProvider.Data>> {
    /** https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md */
    private http: Requester
    private timestamp = 0
    private fullCache: Dict<ShopProvider.Data> = {}
    private tempCache: Dict<ShopProvider.Data> = {}

    constructor(public ctx: Plugin, public config: ShopProvider.Config) {
        super(ctx, 'shop', { authority: 4 })
    }
    get logger(){
        return this.ctx.getLogger('shop')
    }
    async start() {
        await this.prepare().catch((msg)=>this.logger.warn(msg))
        this.refresh()
    }

    flushData() {
        const now = Date.now()
        if (now - this.timestamp < 100) return
        this.timestamp = now
        this.patch(this.tempCache)
        this.tempCache = {}
    }

    async prepare() {
        const cwd = process.cwd()
        let { registry } = this.config
        if (!registry) {
            registry = await new Promise<string>((resolve, reject) => {
                let stdout = ''
                const agent = which()
                const key = (agent?.name === 'yarn' && !agent?.version.startsWith('1.')) ? 'npmRegistryServer' : 'registry'
                const child = spawn(agent?.name || 'npm', ['config', 'get', key], { cwd })
                child.on('exit', (code) => {
                    if (!code) return resolve(stdout)
                    reject(new Error(`child process failed with code ${code}`))
                })
                child.on('error', reject)
                child.stdout.on('data', (data) => {
                    stdout += data.toString()
                })
            })
        }

        this.http = this.ctx.axios.extend({
            endpoint: registry.trim(),
        })

        const meta = loadManifest(cwd)
        const tasks = Object.keys(meta.dependencies).map(async (name) => {
            const registry = await this.http.get<Registry>(`/${name}`)
            const versions = Object.values(registry.versions)
                .map((item:RemotePackage) => pick(item, ['version', 'peerDependencies']))
                .reverse()
            this.tempCache[name] = this.fullCache[name] = { versions } as any
            this.flushData()
        })

        tasks.push(scan({
            version: '2',
            request: this.http.get,
            onItem: (item) => {
                const { name, versions } = item
                this.tempCache[name] = this.fullCache[name] = {
                    ...item,
                    versions: versions.map(item => pick(item, ['version', 'keywords', 'peerDependencies'])),
                }
                this.flushData()
            },
        }))

        await Promise.allSettled(tasks)
    }

    async get() {
        return this.fullCache
    }
}

namespace ShopProvider {
    export interface Config {
        registry?: string
    }

    export interface Data extends Omit<AnalyzedPackage, 'versions'> {
        versions: Partial<PackageJson>[]
    }
}

export default ShopProvider
