import { Plugin } from 'oitq'
import { resolve } from 'path'
import {} from '@oitq/plugin-console'
import BotProvider from "./bots";
export * from './bots'
export {
    BotProvider
}
export const name = 'manager'
export const using = ['console'] as const
export function install(plugin: Plugin) {
    plugin.console.addEntry({
        dev: resolve(__dirname, '../client/index.ts'),
        prod: resolve(__dirname, '../dist'),
    })

    plugin.plugin(BotProvider)
}
declare module '@oitq/plugin-console' {
    namespace Console {
        interface Services {
            bots: BotProvider
        }
    }
}
