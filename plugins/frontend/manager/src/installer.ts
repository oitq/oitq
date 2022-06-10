import { Plugin, defineProperty, Dict } from 'oitq'
import { DataService } from '@oitq/service-console'
import { PkgJson } from '@oitq/shop'
import { resolve } from 'path'
import { promises as fsp } from 'fs'
import { loadManifest } from './utils'
import {} from '@oitq/cli'
import which from 'which-pm-runs'
import spawn from 'cross-spawn'

declare module '@oitq/service-console' {
    interface Events {
        'market/install'(deps: Dict<string>): Promise<number>
        'market/patch'(name: string, version: string): void
    }
}


export interface Dependency {
    request: string
    resolved: string
    workspace: boolean
    active?: boolean
}

class Installer extends DataService<Dict<Dependency>> {
    private manifest: PkgJson
    private _payload: Dict<Dependency>

    constructor(public ctx: Plugin) {
        super(ctx, 'dependencies', { authority: 4 })
        this.manifest = loadManifest(this.cwd)

        ctx.console.addListener('market/install', this.installDep, { authority: 4 })
        ctx.console.addListener('market/patch', this.patchDep, { authority: 4 })
    }

    get cwd() {
        return process.cwd()
    }

    get(force = false) {
        if (!force && this._payload) return this._payload
        const results: Dict<Dependency> = {}
        for (const name in this.manifest.dependencies) {
            try {
                // some dependencies may be left with no local installation
                const meta = loadManifest(name)
                results[name] = {
                    request: this.manifest.dependencies[name],
                    resolved: meta.version,
                    workspace: meta.$workspace,
                }
                defineProperty(results[name], 'active', require.resolve(name) in require.cache)
            } catch {}
        }
        return this._payload = results
    }
    get logger(){
        return this.ctx.getLogger('shop')
    }
    async exec(command: string, args: string[]) {
        return new Promise<number>((resolve) => {
            const child = spawn(command, args, { cwd: this.cwd })
            child.on('exit', (code) => resolve(code))
            child.on('error', () => resolve(-1))
            child.stderr.on('data', (data) => {
                data = data.toString().trim()
                if (!data) return
                for (const line of data.split('\n')) {
                    this.logger.warn(line)
                }
            })
            child.stdout.on('data', (data) => {
                data = data.toString().trim()
                if (!data) return
                for (const line of data.split('\n')) {
                    this.logger.info(line)
                }
            })
        })
    }

    async override(deps: Dict<string>) {
        const filename = resolve(this.cwd, 'package.json')
        for (const key in deps) {
            if (deps[key]) {
                this.manifest.dependencies[key] = deps[key]
            } else {
                delete this.manifest.dependencies[key]
            }
        }
        this.manifest.dependencies = Object.fromEntries(Object.entries(this.manifest.dependencies).sort((a, b) => a[0].localeCompare(b[0])))
        await fsp.writeFile(filename, JSON.stringify(this.manifest, null, 2))
    }

    patchDep = async (name: string, version: string) => {
        await this.override({ [name]: version })
        this.refresh()
    }

    installDep = async (deps: Dict<string>) => {
        const agent = which()?.name || 'npm'
        const oldPayload = this.get()
        await this.override(deps)
        const args: string[] = []
        if (agent !== 'yarn') args.push('install')
        const { registry } = this.ctx.console.shop.config
        if (registry) args.push('--registry=' + registry)
        const code = await this.exec(agent, args)
        if (code) return code
        await this.refresh()
        const newPayload = this.get()
        for (const name in oldPayload) {
            const { active, resolved, workspace } = oldPayload[name]
            if (workspace || !active) continue
            if (newPayload[name].resolved === resolved) continue
            this.ctx.loader.fullReload()
        }
        this.ctx.console.packages.refresh()
        return 0
    }
}

export default Installer
