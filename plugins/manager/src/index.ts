import { Plugin } from 'oitq'
import { resolve } from 'path'
import {} from '@oitq/service-console'
import BotProvider from "./bots";
import Installer from "./installer";
import PackageProvider from "./packages";
import ShopProvider from "./shop";
import ConfigWriter from './writer'
export * from './bots'
export * from './installer'
export * from './packages'
export * from './shop'
export {
    BotProvider,
    Installer,
    PackageProvider,
    ShopProvider,
    ConfigWriter
}
export const name = 'manager'
export const using = ['console'] as const

export interface Config extends ShopProvider.Config {}
export function install(plugin: Plugin,config:Config={}) {
    plugin.console.addEntry({
        dev: resolve(__dirname, '../client/index.ts'),
        prod: resolve(__dirname, '../dist'),
    })

    plugin.plugin(BotProvider)
    plugin.plugin(Installer)
    plugin.plugin(PackageProvider)
    plugin.plugin(ShopProvider,config)
    plugin.plugin(ConfigWriter)
}
declare module '@oitq/service-console' {
    namespace Console {
        interface Services {
            dependencies:Installer
            bots: BotProvider
            shop:ShopProvider
            packages:PackageProvider
        }
    }
}
