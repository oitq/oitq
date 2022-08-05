import {FSWatcher, watch, WatchOptions} from 'chokidar'
import {App, Base, deepClone, Dict, makeArray,Service,Adapter, OitqPlugin} from "oitq";
import * as path from "path";
import * as fs from "fs";

export function loadDependencies(filename: string, ignored: Set<string>) {
    const dependencies = new Set<string>()

    function traverse({filename, children}: NodeJS.Module) {
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
    return Object.keys({...a, ...b}).every(key => deepEqual(a[key], b[key]))
}
function checkChange(oldConfig:Dict,newConfig:Dict,type:'plugin'|'service'|'adapter'){
    for (const name in {...oldConfig, ...newConfig}) {
        if (name.startsWith('~')) continue
        if (deepEqual(oldConfig[name], newConfig[name])) continue
        if (name in newConfig) {
            let p=plugin.app.findOitqPlugin(p=>p.name===name)
            if (name in oldConfig && p) {
                reloadDependency(p,p.fullPath)
            } else {
                loadDependency(name,type)
            }
        } else {
            unloadDependency(name,type)
        }
    }
}
function triggerEntryReload() {
    // use original config
    const oldConfig =deepClone(plugin.app.config)
    const newConfig = deepClone(App.readConfig(process.env.configPath))

    // check non-plugin changes
    const merged = {...oldConfig, ...newConfig}
    delete merged.plugins
    delete merged.services
    delete merged.adapters
    if (Object.keys(merged).some(key => !deepEqual(oldConfig[key], newConfig[key]))) {
        return fullReload()
    }
    plugin.app.config=newConfig
    // check dependencies changes
    checkChange(oldConfig.plugins,newConfig.plugins,'plugin')
    checkChange(oldConfig.services,newConfig.services,'service')
    checkChange(oldConfig.adapters,newConfig.adapters,'adapter')
}

function fullReload() {
    console.info('trigger full reload')
    plugin.app.dispose()
    process.exit(51)
}
function loadDependency(name:string,type:'plugin'|'service'|'adapter'){
    plugin.app.load(name,type)
    plugin.logger.info(`已载入:${type}-${name}`)
}
function unloadDependency(name:string,type:'plugin'|'service'|'adapter'){
    plugin.app.unload(name,type)
    plugin.logger.info(`已移除:${type}-${name}`)
}
function reloadDependency(item: Base&{name:string}, fullPath) {
    try {
        item.dispose()
        item!.emit('dispose')
        delete require.cache[fullPath]
        require(fullPath)
        if (fs.statSync(item.fullPath).isDirectory()) {
            const realPath = item.dependencies.find((temp) =>{
                return temp.startsWith(path.resolve(item.fullPath, 'index'))
            }) || item.dependencies[0]
            delete require.cache[realPath]
            require(realPath)
        }
        plugin.logger.info(`已重载:${item.type}-${item.name}`)
    } catch (e) {
        console.log(e)
    }
}

const externals:Set<string> = new Set<string>()
const plugin = new OitqPlugin('watcher', __filename)
plugin.appendTo('builtin')
for(const p of Object.values(plugin.app.plugins) as OitqPlugin[]){
    externals.add(p.fullPath)
}
for(const s of Object.values(plugin.app.services) as Service[]){
    externals.add(s.fullPath)
}
for(const a of Object.values(plugin.app.adapters) as Adapter[]){
    externals.add(a.fullPath)
}
const config: Watcher.Config = plugin.config||{}
const watchPath=path.resolve(process.cwd(),config.root||'.')
const watcher: FSWatcher = watch(watchPath, {
    ...config,
    ignored: ['**/node_modules/**', '**/.git/**', '**/logs/**', '**/.idea/**', ...makeArray(config.ignored)]
})
plugin.on('plugin-start',(p)=>{
    loadDependencies(p.fullPath,externals)
})
plugin.on('service-dispose',(s)=>{
    externals.delete(s.fullPath)
})
plugin.on('dispose',()=>{
    watcher.close()
})
plugin.on('plugin-start',(p)=>{
    loadDependencies(p.fullPath,externals)
})
plugin.on('plugin-dispose',(p)=>{
    externals.delete(p.fullPath)
})
plugin.on('adapter-start',(a)=>{
    loadDependencies(a.fullPath,externals)
})
plugin.on('adapter-dispose',(a)=>{
    externals.delete(a.fullPath)
})
watcher.on('change', (filename) => {
    const entryFilename=path.resolve(process.cwd(),filename)
    const isEntry = ['oitq.yaml', 'oitq.config.yaml'].some(_ => entryFilename===path.resolve(process.cwd(), _))
    if (isEntry) {
        if (require.cache[entryFilename]) {
            fullReload()
        } else {
            triggerEntryReload()
        }
    } else {
        if (externals.has(entryFilename)) {
            const s = plugin.app.findService(s => s.fullPath === entryFilename || s.dependencies.includes(entryFilename))
            const p = plugin.app.findOitqPlugin(p => p.fullPath === entryFilename || p.dependencies.includes(entryFilename))
            const a = plugin.app.findAdapter(a => a.fullPath === entryFilename || a.dependencies.includes(entryFilename))
            if (p) {
                reloadDependency(p, entryFilename)
            } else if (s) {
                reloadDependency(s, entryFilename)
            } else if (a) {
                reloadDependency(a, entryFilename)

            } else {
                fullReload()
            }
        }
    }
})

export namespace Watcher{
    export interface Config extends WatchOptions {
        root?: string
        debounce?: number
    }
}
