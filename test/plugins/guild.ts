import {Plugin} from "oitq";

export function install(plugin:Plugin){
    plugin.app.on('bot.guild.message',session => {
        console.log(session.toJSON())
    })
}
