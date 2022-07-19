export function template(path: string | string[], ...params: any[]) {
    path=[].concat(path)
    for (const item of path) {
        const source = template.get(item)
        if (typeof source === 'string') {
            return template.format(source, ...params)
        }
    }
    return path[0]
}

export const interpolate = new Function('template', 'context', 'pattern', `
  return template.replace(pattern || /\\{\\{([\\s\\S]+?)\\}\\}/g, (_, expr) => {
    try {
      with (context) {
        const result = eval(expr)
        return result === undefined ? '' : result
      }
    } catch {
      return ''
    }
  })
`) as ((template: string, context: object, pattern?: RegExp) => string)
function deepAssign(head: any, base: any): any {
    Object.entries(base).forEach(([key, value]) => {
        if (typeof value === 'object' && typeof head[key] === 'object') {
            head[key] = deepAssign(head[key], value)
        } else {
            head[key] = base[key]
        }
    })
    return head
}
export namespace template {
    export type Node = string | Store

    export interface Store {
        [K: string]: Node
    }

    const store: Store = {}

    export function set(path: string, value: Node) {
        const seg = path.split('.')
        let node: Node = store
        while (seg.length > 1) {
            node = node[seg.shift()] ||= {}
        }
        deepAssign(node, { [seg[0]]: value })
    }

    export function get(path: string) {
        const seg = path.split('.')
        let node: Node = store
        do {
            node = node[seg.shift()]
        } while (seg.length && node)
        if (typeof node === 'string') return node
    }

    export function format(source: string, ...params: any[]) {
        if (params[0] && typeof params[0] === 'object') {
            source = interpolate(source, params[0])
        }
        let result = ''
        let cap: RegExpExecArray
        // eslint-disable-next-line no-cond-assign
        while (cap = /\{(\w+)\}/.exec(source)) {
            result += source.slice(0, cap.index) + (cap[1] in params ? params[cap[1]] : '')
            source = source.slice(cap.index + cap[0].length)
        }
        return result + source
    }

    export function quote(content: any) {
        return get('basic.left-quote') + content + get('basic.right-quote')
    }

    export function brace(items: any[]) {
        if (!items.length) return ''
        return get('basic.left-brace') + items.join(get('basic.comma')) + get('basic.right-brace')
    }
}
