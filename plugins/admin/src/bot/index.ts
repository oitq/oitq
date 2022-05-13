import {Plugin} from 'oitq';
import * as group from './group'
import * as privatePlugin from './private'
export const name='admin.bot'
export function install(ctx:Plugin){
    ctx.plugin(privatePlugin)
    ctx.plugin(group)
}
