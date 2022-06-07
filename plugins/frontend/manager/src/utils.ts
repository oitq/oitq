import { readFileSync } from 'fs'
import { PkgJson } from '@oitq/shop'
import { defineProperty } from 'oitq'

export interface LocalPkg extends PkgJson {
    private?: boolean
    $workspace?: boolean
}

export function loadManifest(name: string) {
    const filename = require.resolve(name + '/package.json')
    const meta: LocalPkg = JSON.parse(readFileSync(filename, 'utf8'))
    meta.dependencies ||= {}
    defineProperty(meta, '$workspace', !filename.includes('node_modules'))
    return meta
}
