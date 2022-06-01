import { Dict } from 'oitq'
import { computed, watch } from 'vue'
import { createStorage, store } from '@oitq/client'

interface ManagerConfig {
    override: Dict<string>
    showInstalled?: boolean
    hideWorkspace?: boolean
}
export function deepClone<O extends Record<string, any>>(obj:O):O{
    function shallowClone(obj) {
        return Object.assign({},obj); // 我们可以使用原生方法 Object.assign 来快速实现浅克隆
    }
    const result = shallowClone(obj);
    Object.entries(result).forEach(
        ([key,value])=>{
            if(Array.isArray(value)){
                result[key]=value.map(deepClone)
            }else if (typeof value === 'object'){
                result[key] = deepClone(value);
            }
        }
    );
    return result;
}
export const config = createStorage<ManagerConfig>('manager', 2, () => ({
    override: {},
    showInstalled: false,
    hideWorkspace: true,
}))

export const overrideCount = computed(() => {
    return Object.values(config.override).filter(value => value !== undefined).length
})

watch(() => store.dependencies, (value) => {
    if (!value) return
    for (const key in config.override) {
        if (!config.override[key]) {
            if (!value[key]) delete config.override[key]
        } else if (value[key]?.resolved === config.override[key]) {
            delete config.override[key]
        }
    }
}, { immediate: true })

export function addFavorite(name: string) {
    if (config.override[name] || store.packages[name]) return
    config.override[name] = store.shop[name].version
}

export function removeFavorite(name: string) {
    delete config.override[name]
}

export const getMixedMeta = (name: string) => ({
    keywords: [],
    peerDependencies: {},
    ...store.shop[name],
    ...store.packages[name],
})
