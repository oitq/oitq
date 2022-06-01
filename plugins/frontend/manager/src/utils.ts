import { readFileSync } from 'fs'
import { PackageJson as Pkg } from '@oitq/shop'
import { defineProperty } from 'oitq'

export interface LocalPackage extends Pkg {
    private?: boolean
    $workspace?: boolean
}

export function loadManifest(name: string) {
    const filename = require.resolve(name + '/package.json')
    const meta: LocalPackage = JSON.parse(readFileSync(filename, 'utf8'))
    meta.dependencies ||= {}
    defineProperty(meta, '$workspace', !filename.includes('node_modules'))
    return meta
}
