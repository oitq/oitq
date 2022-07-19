import { resolve } from 'path'
import spawn from 'cross-spawn'
import { readdir } from 'fs-extra'
import { SpawnOptions } from 'child_process'

export const cwd = resolve(__dirname, '..')

const categories = [
    'adapters',
    'packages',
    'plugins',
    'services',
    "plugins/frontend"
]

export async function getPackages(args: readonly string[]) {
    const folders = (await Promise.all(categories.map(async (seg) => {
        const names = await readdir(`${cwd}/${seg}`).catch<string[]>(() => [])
        return names.map(name => `${seg}/${name}`).filter(name => !name.includes('.') && !categories.includes(name))
    }))).flat()
    return args.length ? folders.filter(folder=>args.includes(folder)) : folders
}

export function requireSafe(id: string) {
    try {
        return require(id)
    } catch {}
}

export type DependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'

export interface PackageJson extends Partial<Record<DependencyType, Record<string, string>>> {
    name?: string
    main?: string
    module?: string
    description?: string
    private?: boolean
    version?: string
}

export function spawnSync(args: string[], silent?: boolean) {
    if (!silent) console.log(`$ ${args.join(' ')}`)
    const result = spawn.sync(args[0], [...args.slice(1), '--color'], { cwd, encoding: 'utf8' })
    if (result.status) {
        throw new Error(result.stderr)
    } else {
        if (!silent) console.log(result.stdout)
        return result.stdout.trim()
    }
}

export function spawnAsync(args: string[], options?: SpawnOptions) {
    const child = spawn(args[0], args.slice(1), { cwd, stdio: 'inherit', ...options })
    return new Promise<number>((resolve) => {
        child.on('close', resolve)
    })
}
