import {Plugin} from 'oitq'
import {Loader} from './loader';
import * as watcher from './watcher'

function handleException(error: any) {
    console.error(error)
    process.exit(1)
}

process.on('uncaughtException', handleException)
import * as daemon from './daemon'
process.on('unhandledRejection', (error) => {
    console.warn(error)
})
namespace addons {
    export const name = 'CLI'

    export function install(plugin: Plugin,config) {
        plugin.plugin(daemon, config)

        if (process.env.OITQ_WATCH_ROOT !== undefined) {
            (config.watch ??= {}).root = process.env.OITQ_WATCH_ROOT
            plugin.plugin(watcher, config.watch)
        }
    }
}
const loader=new Loader();
loader.createApp()
    .plugin(addons,loader.config)
    .start()
