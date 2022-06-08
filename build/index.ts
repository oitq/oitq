import { BuildOptions } from 'esbuild'

export interface InputBuildOptions extends BuildOptions {
    entryPoints: string[]
}

type DefineBuild = (base: string, options: InputBuildOptions) => void | Promise<void> | BuildOptions[] | Promise<BuildOptions[]>

export const defineBuild = (callback: DefineBuild) => callback
