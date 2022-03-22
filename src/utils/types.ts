export type Dict<T extends any=any,K extends (symbol|string)=string>={
    [P in K]:T
}
export type Extend<B extends Dict,N extends Dict=Dict>={
    [P in (keyof B|keyof N)]:P extends keyof B?B[P]:P extends keyof N?N[P]:unknown
}
export type Define<D extends Dict,K extends string,V extends any=any>={
    [P in (K|keyof D)]:P extends keyof D?D[P]:P extends K?V:unknown
}

export type Promisify<T> = Promise<T extends Promise<infer S> ? S : T>
export type Awaitable<T> = [T] extends [Promise<unknown>] ? T : T | Promise<T>
