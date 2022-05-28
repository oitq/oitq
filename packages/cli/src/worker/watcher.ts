import {  Dict, makeArray,App, Plugin } from 'oitq'
import { FSWatcher, watch, WatchOptions } from 'chokidar'
import { relative, resolve } from 'path'
import { debounce } from 'throttle-debounce'
import ns from 'ns-require'
import {Dispose} from "oitq";

function loadDependencies(filename: string, ignored: Set<string>) {
    const dependencies = new Set<string>()
    function traverse({ filename, children }: NodeJS.Module) {
        if (ignored.has(filename) || dependencies.has(filename) || filename.includes('/node_modules/')) return
        dependencies.add(filename)
        children.forEach(traverse)
    }
    traverse(require.cache[filename])
    return dependencies
}

function deepEqual(a: any, b: any) {
    if (a === b) return true
    if (typeof a !== typeof b) return false
    if (typeof a !== 'object') return false
    if (!a || !b) return false

    // check array
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false
        return a.every((item, index) => deepEqual(item, b[index]))
    } else if (Array.isArray(b)) {
        return false
    }

    // check object
    return Object.keys({ ...a, ...b }).every(key => deepEqual(a[key], b[key]))
}
declare module 'oitq'{
    interface Plugin{
        watcher:Watcher
    }
}

export class Watcher {
    public suspend = false
    private root: string
    private watcher: FSWatcher

    /**
     * changes from externals E will always trigger a full reload
     *
     * - root R -> external E -> none of plugin Q
     */
    private externals: Set<string>

    /**
     * files X that should be reloaded
     *
     * - including all stashed files S
     * - some plugin P -> file X -> some change C
     */
    private accepted: Set<string>

    /**
     * files X that should not be reloaded
     *
     * - including all externals E
     * - some change C -> file X -> none of change D
     */
    private declined: Set<string>

    /** stashed changes */
    private stashed = new Set<string>()
    private app:App
    constructor(plugin: Plugin, private config: Watcher.Config) {
        this.app=plugin.app
        plugin.watcher = this
        this.app.on('ready', () => this.start())
        this.app.on('dispose', () => this.stop())
    }

    start() {
        const { loader } = this.app
        const { root = '', ignored = [] } = this.config
        this.root = resolve(loader.dirname, root)
        this.watcher = watch(this.root, {
            ...this.config,
            ignored: ['**/node_modules/**', '**/.git/**', '**/logs/**','**/.idea/**', ...makeArray(ignored)],
        })

        // files independent from any plugins will trigger a full reload
        this.externals = loadDependencies(__filename, new Set(Object.values(loader.cache)))
        const triggerLocalReload = debounce(this.config.debounce, () => this.triggerLocalReload())

        this.watcher.on('change', (path) => {
            const isEntry = path === loader.filename
            if (this.suspend && isEntry) {
                this.suspend = false
                return
            }
            this.logger.debug('change detected:', relative(this.root, path))

            if (isEntry) {
                if (require.cache[path]) {
                    this.app.loader.fullReload()
                } else {
                    this.triggerEntryReload()
                }
            } else {
                if (this.externals.has(path)) {
                    this.app.loader.fullReload()
                } else if (require.cache[path]) {
                    this.stashed.add(path)
                    triggerLocalReload()
                }
            }
        })
    }

    stop() {
        return this.watcher.close()
    }

    private triggerEntryReload() {
        // use original config
        const { loader } = this.app
        const oldConfig = loader.config
        loader.readConfig()
        const newConfig = loader.config

        // check non-plugin changes
        const merged = { ...oldConfig, ...newConfig }
        delete merged.plugins
        if (Object.keys(merged).some(key => !deepEqual(oldConfig[key], newConfig[key]))) {
            return this.app.loader.fullReload()
        }

        // check plugin changes
        const oldPlugins = oldConfig.plugins
        const newPlugins = newConfig.plugins
        for (const name in { ...oldPlugins, ...newPlugins }) {
            if (name.startsWith('~')) continue
            if (deepEqual(oldPlugins[name], newPlugins[name])) continue
            if (name in newPlugins) {
                loader.reloadPlugin(name)
            } else {
                loader.destroyPlugin(name)
            }
        }
    }
    private get logger(){
        return this.app.getLogger('Watcher')
    }
    private analyzeChanges() {
        /** files pending classification */
        const pending: string[] = []

        this.accepted = new Set(this.stashed)
        this.declined = new Set(this.externals)

        this.stashed.forEach((filename) => {
            const { children } = require.cache[filename]
            for (const { filename } of children) {
                if (this.accepted.has(filename) || this.declined.has(filename) || filename.includes('/node_modules/')) continue
                pending.push(filename)
            }
        })

        while (pending.length) {
            let index = 0, hasUpdate = false
            while (index < pending.length) {
                const filename = pending[index]
                const { children } = require.cache[filename]
                let isDeclined = true, isAccepted = false
                for (const { filename } of children) {
                    if (this.declined.has(filename) || filename.includes('/node_modules/')) continue
                    if (this.accepted.has(filename)) {
                        isAccepted = true
                        break
                    } else {
                        isDeclined = false
                        if (!pending.includes(filename)) {
                            hasUpdate = true
                            pending.push(filename)
                        }
                    }
                }
                if (isAccepted || isDeclined) {
                    hasUpdate = true
                    pending.splice(index, 1)
                    if (isAccepted) {
                        this.accepted.add(filename)
                    } else {
                        this.declined.add(filename)
                    }
                } else {
                    index++
                }
            }
            // infinite loop
            if (!hasUpdate) break
        }

        for (const filename of pending) {
            this.declined.add(filename)
        }
    }

    private triggerLocalReload() {
        this.analyzeChanges()
        /** plugins pending classification */
        const pending = new Map<string, Dispose[]>()

        /** plugins that should be reloaded */
        const reloads = new Map<Plugin, string>()

        // we assume that plugin entry files are "atomic"
        // that is, reloading them will not cause any other reloads
        for (const filename in require.cache) {
            const module = require.cache[filename]
            const plugin = ns.unwrapExports(module.exports)
            const state = this.app.disposes
            if (!state || this.declined.has(filename)) continue
            pending.set(filename, state)
            if (plugin && !plugin['sideEffect']) this.declined.add(filename)
        }

        for (const [filename] of pending) {
            this.declined.delete(filename)
            const dependencies = [...loadDependencies(filename, this.declined)]
            if (!dependencies.some(dep => this.accepted.has(dep))) continue
            dependencies.forEach(dep => this.accepted.add(dep))


            for(const [pluginName,p] of this.app.pluginManager.plugins){
                if(filename.includes(p.fullpath) || filename.startsWith(p.path)){
                    reloads.set(p,filename)
                }
            }
        }

        // save require.cache for rollback
        const backup: Dict<NodeJS.Module> = {}
        for (const filename of this.accepted) {
            backup[filename] = require.cache[filename]
        }

        // delete module cache before re-require
        this.accepted.forEach((path) => {
            delete require.cache[path]
        })

        // attempt to load entry files
        const attempts = {}
        try {
            for (const [, filename] of reloads) {
                attempts[filename] = ns.unwrapExports(require(filename))
            }
        } catch (err) {
            // rollback require.cache
            this.logger.warn(err)
            return rollback()
        }

        function rollback() {
            for (const filename in backup) {
                require.cache[filename] = backup[filename]
            }
        }

        try {
            for (const [plugin] of reloads) {
                plugin.restart()
            }
        } catch {
            // rollback require.cache and plugin states
            rollback()

            for (const [state] of reloads) {
                state.restart()
            }
            return
        }

        // reset stashed files
        this.stashed = new Set()
    }
}

namespace Watcher {
    export interface Config extends WatchOptions {
        root?: string
        debounce?: number
    }

}
export const name='Watcher'
export function install(app:App,config:Watcher.Config){
    new Watcher(app,config)
}
