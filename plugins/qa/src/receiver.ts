import {Dialogue} from './teach'
import {NSession,Plugin} from "oitq";
import {QA} from "./models";

function hasEnv(envs, type, target) {
    return envs.length === 0 || envs.some(item => {
        return item.type === type && (item.target==='*' || item.target.includes(String(target)))
    })
}


export async function triggerTeach(ctx: Plugin, session: NSession<'message'>) {
    const teaches = await QA.findAll()
    const question=session.cqCode
    const dialogues = teaches.map(teach => teach.toJSON())
        .filter((teach) => hasEnv(teach.belongs, session.message_type, session.group_id || session.discuss_id || session.user_id))
        .filter(teach => {
            return teach.isReg ?
                new RegExp(teach.question).test(question) :
                question === teach.question
        })
    const totalProbability = dialogues.reduce((p, dialogue: Dialogue) => {
        p += dialogue.probability
        return p
    }, 0)

    function fixProbability(probability) {
        let baseProbability = 0
        dialogues.forEach((dialogue) => {
            dialogue.activeArea = [baseProbability, dialogue.probability / (totalProbability<0?1:totalProbability) + baseProbability]
            baseProbability += dialogue.probability / (totalProbability<0?1:totalProbability)
            dialogue['active'] = probability > dialogue.activeArea[0] && probability <= dialogue.activeArea[1]
        })
    }

    fixProbability(Math.random())
    if (!dialogues.length) return;
    const [dialogue] = dialogues.filter(d => d.active)
    if (!dialogue) return;
    if (dialogue.redirect) {
        if (dialogue.isReg) {
            const args = new RegExp(dialogue.question).exec(question)
            let index = 0
            while (index<args.length-1) {
                index++;
                const reg=new RegExp('\\$'+index,'gm')
                dialogue.redirect = dialogue.redirect.replace(reg, args[index])
            }
        }
        session.cqCode = dialogue.redirect
        return triggerTeach(ctx, session)
    }
    if (dialogue.isReg) {
        const args = new RegExp(dialogue.question).exec(question)
        let index = 0
        while (index<args.length-1) {
            index++;
            const reg=new RegExp('\\$'+index,'gm')
            dialogue.answer = dialogue?.answer.replace(reg, args[index])
        }
    }
    let answerText=dialogue.answer
        .replace(/\$0/g,question)
    try{
        session.bot.sendMsg(session.getChannelId(),await session.executeTemplate(answerText) as string)
    }catch{
        await session.app.executeCommand(session,answerText)
    }
    return true
}

export default function install(plugin: Plugin) {
    plugin.middleware((session: NSession<'message'>) =>triggerTeach(plugin, session))
}
