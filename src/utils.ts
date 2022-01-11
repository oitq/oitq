
export function success(data){
    return {
        success:true,
        data
    }
}
export function error(errMsg){
    return {
        success:false,
        msg:errMsg
    }
}
export function merge(head, base) {
    Object.entries(base).forEach(([key, value]) => {
        if (typeof head[key] === 'undefined')
            return head[key] = base[key];
        if (typeof value === 'object' && typeof head[key] === 'object') {
            head[key] = merge(head[key], value);
        }
    });
    return head;
}
export function remove<T>(list: T[], item: T) {
    const index = list.indexOf(item)
    if (index >= 0) {
        list.splice(index, 1)
        return true
    }
}
export async function sleep(timeout){
    return new Promise(resolve => setTimeout(resolve,timeout))
}
export type MaybeArray<T> = [T] extends [unknown[]] ? T : T | T[]