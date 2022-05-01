import lodash = require('lodash')
import { genDmMessageId } from "oicq/lib/message/message.js";
import querystring from "querystring";
import {MessageElem} from "oicq";
const mCQ = {
    "&#91;": "[",
    "&#93;": "]",
    "&amp;": "&",
};
const mCQInside = {
    "&": "&amp;",
    ",": "&#44;",
    "[": "&#91;",
    "]": "&#93;",
};
export function qs(text, sep = ",", equal = "=") {
    const ret = {};

    text.split(sep).forEach((c) => {
        const i = c.indexOf(equal);

        if (-1 === i) {
            return;
        }

        ret[c.substring(0, i)] = c
            .substring(i + 1)
            .replace(new RegExp(Object.values(mCQInside).join("|"), "g"), (s) => lodash.invert(mCQInside)[s] || "");
    });

    for (const k in ret) {
        try {
            if ("text" !== k) {
                ret[k] = JSON.parse(ret[k]);
            }
        } catch (e) {
            // do nothing
        }
    }

    return ret;
}
export type SegmentElem={data:Omit<MessageElem, 'type'>,type:MessageElem['type']}
export function toSegment(msgList:MessageElem|MessageElem[]):SegmentElem[]{
    msgList=[].concat(msgList)
    return msgList.map(msg=>{
        const {type,...other}=msg
        return {type,data:other}
    })
}
export function fromSegment(msgList:SegmentElem|SegmentElem[]):MessageElem[]{
    msgList=[].concat(msgList)
        return msgList.map(msg=>{
            const {type,data,...other}=msg
            return {type,...other,...data} as MessageElem
        })

}
export function toCqcode(msg:any) {
    const isQuote = !!msg?.source?.message;
    let cqcode = "";

    if (true === isQuote) {
        const quote = { ...msg.source, flag: 1 };
        const mid = genDmMessageId(quote.user_id, quote.seq, quote.rand, quote.time, quote.flag);

        cqcode += `[CQ:reply,id=${mid}]`;
    }
    msg.message=[].concat(msg.message);
    (msg.message || []).forEach((c) => {
        if ("text" === c.type) {
            cqcode += c.text;
            return;
        }
        const s = querystring.stringify(c, ",", "=", {
            encodeURIComponent: (s) =>
                s.replace(new RegExp(Object.keys(mCQInside).join("|"), "g"), (s) => mCQInside[s] || ""),
        });
        const cq = `[CQ:${c.type}${s ? "," : ""}${s}]`;

        cqcode += cq;
    });
    return cqcode;
}
function matchBracket(text, index, brackets = ["[", "]"]) {
    let stackSize = 0;

    if ("string" !== typeof text || text.length <= 2) {
        return -3;
    }

    if (0 > index || index > text.length - 1) {
        return -4;
    }

    if (!Array.isArray(brackets) || 2 !== brackets.length) {
        return -5;
    }

    for (const bracket of brackets) {
        if ("string" !== typeof bracket || 1 !== bracket.length) {
            return -5;
        }
    }

    const start = text[index];

    if (start !== brackets[0]) {
        return -1;
    }

    for (let i = index; i < text.length; ++i) {
        if (brackets[0] === text[i]) {
            ++stackSize;
        }

        if (brackets[1] === text[i]) {
            --stackSize;
        }

        if (0 === stackSize) {
            return i;
        }
    }

    return -2;
}
export function fromCqcode(text = "") {
    const elems = [];
    const items = [];
    let itemsSize = 0;

    for (let i = 0; i < text.length; ++i) {
        const brackets = ["[", "]"];
        const pos = matchBracket(text, i, brackets);

        switch (pos) {
            case -1:
                if (undefined === items[itemsSize]) {
                    items[itemsSize] = "";
                }

                items[itemsSize] += text[i];
                continue;
            case -2:
                throw `消息 CQ 码不匹配：${text}`;
            case -3:
            case -4:
                items.push(text);
                i = text.length;
                break;
            case -5:
                // This is impossible
                throw `错误的括号匹配：${brackets.join("")}`;
            default:
                if (pos > 0) {
                    items.push(text.substring(i, pos + 1));
                    i = pos;
                    itemsSize = items.length;
                }
        }
    }

    for (const c of items) {
        const s = c.replace(new RegExp(Object.keys(mCQ).join("|"), "g"), (s) => mCQ[s] || "");
        let cq = c.replace("[CQ:", "type=");

        if ("string" === typeof s && "" !== s && !s.includes("[CQ:")) {
            elems.push({ type: "text", text: s });
            continue;
        }

        cq = cq.substring(0, cq.length - 1);
        elems.push(qs(cq));
    }

    return elems;
}
