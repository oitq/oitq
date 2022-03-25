import * as qs from 'querystring'
import {MessageElem} from "oicq";
function escapeCQInside(s) {
    if (s === "&")
        return "&amp;";
    if (s === ",")
        return "&#44;";
    if (s === "[")
        return "&#91;";
    if (s === "]")
        return "&#93;";
    return "";
}
export function genCqcode(content:MessageElem[]) {
    let cqcode = "";
    for (let elem of content) {
        if (elem.type === "text") {
            cqcode += elem.text;
            continue;
        }
        const tmp = { ...elem };
        tmp.type = undefined;
        const str = qs.stringify(tmp as any, ",", "=", { encodeURIComponent: (s) => s.replace(/&|,|\[|\]/g, escapeCQInside) });
        cqcode += "[CQ:" + elem.type + (str ? "," : "") + str + "]";
    }
    return cqcode;
}
