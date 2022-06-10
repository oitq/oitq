import {App, Dict, omit, pick, Plugin, remove } from 'oitq'
import { DataService } from '@oitq/service-console'
import { PkgJson } from '@oitq/shop'
import { promises as fsp } from 'fs'
import { dirname } from 'path'
import ns from 'ns-require'
import {} from '@oitq/cli'
import { loadManifest } from './utils'
/** require without affecting the dependency tree */
function getExports(id: string) {
    const path = require.resolve(id)
    const keys = Object.keys(require.cache)
    let result = require.cache[path]
    if (!result) {
        require(path)
        result = require.cache[path]
        remove(module.children, result)
        for (const key in require.cache) {
            if (!keys.includes(key)) {
                delete require.cache[key]
            }
        }
    }
    return ns.unwrapExports(result.exports)
}

class PackageProvider extends DataService<Dict<PackageProvider.Data>> {
    cache: Dict<PackageProvider.Data> = {}
    task: Promise<void>

    constructor(public ctx: Plugin, config: PackageProvider.Config) {
        super(ctx, 'packages', { authority: 4 })

        this.ctx.app.on('plugin-install', async (plg) => {
            this.updatePackage(plg, plg.pkg.name)
        })

        this.ctx.app.on('plugin-destroy', async (plg) => {
            this.updatePackage(plg, null)
        })
    }

    get logger(){
        return this.ctx.getLogger('shop')
    }

    private async updatePackage(plugin: Plugin, id: string) {
        const entry = Object.keys(require.cache).find((key) => {
            return ns.unwrapExports(require.cache[key].exports) === plugin
        })
        if (!this.cache[entry]) return
        const local = this.cache[entry]
        local.id = id
        this.refresh()
    }

    async prepare() {
        this.cache = {}
        let baseDir  = process.cwd()
        const tasks: Promise<void>[] = []
        while (1) {
            tasks.push(this.loadDirectory(baseDir))
            const parent = dirname(baseDir)
            if (baseDir === parent) break
            baseDir = parent
        }
        await Promise.all(tasks)
    }

    async get(forced = false) {
        if (forced) delete this.task
        await (this.task ||= this.prepare())

        // add app config
        const packages = Object.values(this.cache)
        packages.unshift({
            name: '',
            shortname: '',
            config: omit(this.ctx.app.config, ['plugins','services']),
        })

        return Object.fromEntries(packages.filter(x => x).map(data => [data.name, data]))
    }

    private async loadDirectory(baseDir: string) {
        const base = baseDir + '/node_modules'
        const files = await fsp.readdir(base).catch(() => [])
        for (const name of files) {
            const base2 = base + '/' + name
            if (name.startsWith('@')) {
                const files = await fsp.readdir(base2).catch(() => [])
                for (const name2 of files) {
                    if (name === '@oitq' && (name2.startsWith('plugin-') || name2.startsWith('service-'))) {
                        this.loadPackage(name + '/' + name2, base2 + '/' + name2)
                    }
                }
            } else {
                if (name.startsWith('oitq-plugin-') || name.startsWith('oitq-service-')) {
                    this.loadPackage(name, base2)
                }
            }
        }
    }

    private loadPackage(name: string, path: string) {
        try {
            // require.resolve(name) may be different from require.resolve(path)
            // because tsconfig-paths may resolve the path differently
            this.cache[require.resolve(name)] = this.parsePackage(name)
        } catch (error) {
            console.error(error)
            this.logger.warn('failed to parse %c', name)
            this.logger.debug(error)
        }
    }

    private parsePackage(name: string) {
        const data = loadManifest(name)
        const result = pick(data, [
            'name',
            'version',
            'description',
            'peerDependencies',
        ]) as PackageProvider.Data

        // workspace packages are followed by symlinks
        result.workspace = data.$workspace
        result.shortname = data.name.replace(/(oitq-|^@oitq\/)(plugin|service)-/, '')


        // check plugin state
        const { plugins,services } = this.ctx.app.config
        result.root = result.shortname in plugins||result.shortname in services
        result.config = plugins[result.shortname] || services[result.shortname]

        // make sure that result can be serialized into json
        JSON.stringify(result)

        return result
    }
}

namespace PackageProvider {
    export interface Config {}

    export interface Data extends Partial<PkgJson> {
        id?: string
        root?: boolean
        config?: any
        shortname?: string
        workspace?: boolean
    }
}

export default PackageProvider
