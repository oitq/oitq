import segment from "./segment";
export * from './functions'
export * from './template'
export * from './types'
export * from './time'
export * from './random'
export {segment as s}
export * from './cqcode'
export function pick<T, K extends keyof T>(source: T, keys?: Iterable<K>, forced?: boolean) {
    if (!keys) return { ...source }
    const result = {} as Pick<T, K>
    for (const key of keys) {
        if (forced || key in source) result[key] = source[key]
    }
    return result
}

export function omit<T, K extends keyof T>(source: T, keys?: Iterable<K>) {
    if (!keys) return { ...source }
    const result = { ...source } as Omit<T, K>
    for (const key of keys) {
        Reflect.deleteProperty(result, key)
    }
    return result
}

