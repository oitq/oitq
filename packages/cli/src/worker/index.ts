import {Plugin} from 'oitq'
import {Loader} from './loader';
import {Watcher} from './watcher'
export {Loader} from './loader'
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

    export function install(plugin: Plugin, config) {
        plugin.plugin(daemon, config)

        if (process.env.OITQ_WATCH_ROOT !== undefined) {
            (config.watch ??= {}).root = process.env.OITQ_WATCH_ROOT
            plugin.service(Watcher, config.watch)
        }
    }
}
declare module 'oitq'{
    namespace Plugin{
        interface Services{
            loader:Loader
            watcher:Watcher
        }
    }
}
const loader = new Loader();
const app = loader.createApp()
app.plugin(addons, loader.config)
app.start()
