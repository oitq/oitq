import {Session} from "oitq";
export function isSaveEnv(session1:Session,session2:Session){
    if(session1.message_type==='group')return session1.group_id===session2.group_id
    if(session1.message_type==='discuss')return session1.discuss_id===session2.discuss_id
    if(session1.message_type==='private')return session1.user_id===session2.user_id&&session2.message_type==='private'
    return false
}
export function formatContext(session: Session) {
    return session.message_type === 'private' ? `私聊 ${session.user_id}` : `群聊 ${session.group_id}`
}
