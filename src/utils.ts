import * as os from 'os'
// 深合并
export function deepMerge(base, ...from) {
    if (from.length === 0) {
        return base;
    }
    if (typeof base !== 'object') {
        return base;
    }
    if (Array.isArray(base)) {
        return base.concat(...from);
    }
    for (const item of from) {
        for (const key in item) {
            if (base.hasOwnProperty(key)) {
                if (typeof base[key] === 'object') {
                    base[key] = deepMerge(base[key], item[key]);
                }
                else {
                    base[key] = item[key];
                }
            }
            else {
                base[key] = item[key];
            }
        }
    }
    return base;
}
// 深拷贝
export function deepClone(obj) {
    if (typeof obj !== 'object')
        return obj;
    if (!obj)
        return obj;
    //判断拷贝的obj是对象还是数组
    if (Array.isArray(obj))
        return obj.map((item) => deepClone(item));
    const objClone = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] && typeof obj[key] === "object") {
                objClone[key] = deepClone(obj[key]);
            }
            else {
                objClone[key] = obj[key];
            }
        }
    }
    return objClone;
}
function deepen(modifyString: (source: string) => string) {
    function modifyObject<T extends unknown>(source: T): T {
        if (typeof source !== 'object' || !source) return source
        if (Array.isArray(source)) return source.map(modifyObject) as any
        const result = {} as any
        for (const key in source) {
            result[modifyString(key)] = modifyObject(source[key])
        }
        return result as T
    }

    return function<T> (source: T): T {
        if (typeof source === 'string') {
            return modifyString(source) as any
        } else {
            return modifyObject(source)
        }
    }
}
export function isNullable(value: any) {
    return value === null || value === undefined
}
export function isBailed(value: any) {
    return value !== null && value !== false && value !== undefined
}
export function makeArray<T>(source: T | T[]) {
    return Array.isArray(source) ? source : isNullable(source) ? [] : [source]
}
export function noop(): any {}
export const camelCase = deepen(source => source.replace(/[_-][a-z]/g, str => str.slice(1).toUpperCase()))
export const paramCase = deepen(source => source.replace(/_/g, '-').replace(/(?<!^)[A-Z]/g, str => '-' + str.toLowerCase()))
export const snakeCase = deepen(source => source.replace(/-/g, '_').replace(/(?<!^)[A-Z]/g, str => '_' + str.toLowerCase()))
/**
 * 获取当前机器的ip地址
 */
export function getIpAddress() {
    const interfaces=os.networkInterfaces()

    for (let dev in interfaces) {
        let iFace = interfaces[dev]

        for (let i = 0; i < iFace.length; i++) {
            let {family, address, internal} = iFace[i]

            if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
                return address
            }
        }
    }
}

export const camelize = camelCase
export const hyphenate = paramCase
export function wrapExport(filepath:string){
    const {default:result,...other}=require(filepath)
    return result?Object.assign(result,other):other
}
export function remove<I extends any>(list:I[],item:I){
    const index=list.indexOf(item)
    if(index<0) return false
    list.splice(index,1)
    return true
}
