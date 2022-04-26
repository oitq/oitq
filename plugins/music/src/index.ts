import {Context} from "oitq";

import lodash from "lodash";
import querystring from "querystring";
import {MusicPlatform} from "oicq";

export const name = 'music'
const m_ERR_CODE = Object.freeze({
    ERR_SRC: "1",
    ERR_404: "2",
    ERR_API: "3",
});

const m_ERR_MSG = Object.freeze({
    [m_ERR_CODE.ERR_SRC]: "错误的音乐源",
    [m_ERR_CODE.ERR_404]: "没有查询到对应歌曲",
    [m_ERR_CODE.ERR_API]: "歌曲查询出错",
});

async function musicQQ(keyword,ctx) {
    const url = "https://c.y.qq.com/soso/fcgi-bin/client_search_cp";
    const query = {w: keyword};
    const headers = {
        "Content-Type": "application/x-javascript;charset=utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    };
    let jbody;
    try {
        jbody = await ctx.http.get(`${url}?${new URLSearchParams(query)}`, {headers});
    } catch (e) {
        return m_ERR_CODE.ERR_API;
    }

    if (!jbody) {
        return m_ERR_CODE.ERR_API;
    }

    try {
        // callback({"code":0,"data":{})
        const starti = "callback(".length;
        jbody = JSON.parse(jbody.substring(starti, jbody.length - 1));
    } catch (e) {
        return m_ERR_CODE.ERR_API;
    }

    if (lodash.hasIn(jbody, "data.song.list[0].songid")) {
        return {type: "qq" as MusicPlatform, id: jbody.data.song.list[0].songid};
    }

    return m_ERR_CODE.ERR_404;
}

async function music163(keyword,ctx) {
    const url = "https://music.163.com/api/search/get/";
    const form = {
        s: keyword,
        // 1:单曲、 10:专辑、 100:歌手、 1000:歌单、 1002:用户、 1004:MV、 1006:歌词、 1009:电台、 1014:视频
        type: 1,
        limit: 1,
        offset: 0,
    };
    const body = querystring.stringify(form);
    const headers = {
        "Content-Length": String(body.length),
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://music.163.com",
        Cookie: "appver=2.0.2",
    };
    let jbody;
    try {
        jbody = await ctx.http.post(url,body, {headers});
    } catch (e) {
        return m_ERR_CODE.ERR_API;
    }

    if (!jbody) {
        return m_ERR_CODE.ERR_API;
    }

    if (lodash.hasIn(jbody, "result.songs[0].id")) {
        return {type: "163" as MusicPlatform, id: jbody.result.songs[0].id};
    }

    return m_ERR_CODE.ERR_404;
}

type MusicInfo = {
    type: MusicPlatform,
    id: string
}

export function install(ctx: Context) {
    ctx
        .group()
        .command('music [keyword:string]', '点歌')
        .shortcut('点歌', {fuzzy: true})
        .shortcut(/^来一首(\S+)$/, {args:['$1']})
        .option('platform', '-p <platform:string> 音乐平台', {fallback: '163'})
        .action(async ({session, options}, keyword) => {
            if(!keyword){
                const input=await session.prompt({
                    name:'keyword',
                    type:'text',
                    message:'点什么歌呀'
                })
                if(!input.keyword)return
                keyword=input.keyword
            }
            let musicInfo: string | MusicInfo
            switch (options.platform) {
                case '163':
                    musicInfo = await music163(keyword,ctx)
                    break;
                case 'qq':
                    musicInfo = await musicQQ(keyword,ctx)
                    break;
                default:
                    musicInfo = m_ERR_CODE.ERR_SRC
                    break;
            }
            if(typeof musicInfo==='string'){
                return m_ERR_MSG[musicInfo]
            }
            await session.bot.pickGroup(session.group_id).shareMusic(musicInfo.type,musicInfo.id)
            return true
        })
}
