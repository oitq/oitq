//@ts-nocheck
let event: any;

function _exec(o: any, op = "and", field): boolean {

    if (["and", "not", "or"].includes(op)) {
        if (Array.isArray(o)) {
            for (let rule of o) {
                let matched = _exec(rule, "and", field);
                if (!matched && op === "and")
                    return false;
                if (matched && op === "not")
                    return false;
                if (matched && op === "or")
                    return true;
            }
            return op !== "or" || !o.length;
        } else if (typeof o === "object" && o !== null) {
            for (let k in o) {
                let matched;
                if (k.startsWith("."))
                    matched = _exec(o[k], k.substr(1), field);
                else
                    matched = _exec(o[k], "eq", k);
                if (!matched && op === "and")
                    return false;
                if (matched && op === "not")
                    return false;
                if (matched && op === "or")
                    return true;
            }
            return op !== "or" || !Object.keys(o).length;
        } else {
            return false;
        }
    }

    if (typeof o === "object" && o !== null && !Array.isArray(o))
        return _exec(o, "and", field);

    if (op === "eq") {
        return o === event[field];
    }

    if (op === "neq") {
        return o !== event[field];
    }

    if (op === "in") {
        return o.includes(event[field]);
    }

    if (op === "contains") {
        return event[field].includes(o);
    }

    if (op === "regex") {
        if (o.startsWith("/"))
            o = o.substr(1);
        const split = o.split("/");
        const regex = new RegExp(split[0], split[1]);
        return !!event[field].match(regex);
    }

    return true;
}


export function assert(filter: any, e: any) {
    if (!filter)
        return true;
    event = e;
    try {
        return _exec(filter);
    } catch {
        return false;
    }
}
