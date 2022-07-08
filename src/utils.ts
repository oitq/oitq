import * as fs from 'fs'
import * as path from 'path'
export function deepMerge<T extends any>(base:T, ...from:T[]):T{
    if(from.length===0){
        return base
    }
    if(typeof base!=='object'){
        return base
    }
    if(Array.isArray(base)){
        return base.concat(...from) as T
    }
    for (const item of from){
        for(const key in item){
            if(base.hasOwnProperty(key)){
                if(typeof base[key]==='object'){
                    base[key]=deepMerge(base[key],item[key])
                }else{
                    base[key]=item[key]
                }
            }else{
                base[key]=item[key]
            }
        }
    }
    return base
}
// 深拷贝
export function deepClone<T extends any>(obj:T):T {
    if(typeof obj!=='object') return obj
    if(!obj) return obj
    //判断拷贝的obj是对象还是数组
    if(Array.isArray(obj)) return obj.map((item)=>deepClone(item)) as T
    const objClone={} as T
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] && typeof obj[key] === "object") {
                objClone[key] = deepClone(obj[key]);
            } else {
                objClone[key] = obj[key];
            }
        }
    }
    return objClone;
}
export function removeDir(dirPath:string,force?:boolean){
    function rmdirAsync (directoryPath) {
        try {
            let stat = fs.statSync(directoryPath)
            if (stat.isFile()) {
                fs.unlinkSync(directoryPath)
            } else {
                force && fs.readdirSync(directoryPath).map(dir => rmdirAsync(path.join(directoryPath, dir)))
                fs.readdirSync(directoryPath)
            }
        } catch (e) {
            alert(e);
        }
    }
    fs.existsSync(dirPath) && rmdirAsync(dirPath)
}
