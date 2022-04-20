import {createApp} from "oitq"
import * as database from '@oitq/plugin-database'
import * as qa from '@oitq/plugin-qa'
import * as schedule from '@oitq/plugin-schedule'
import * as common from '@oitq/plugin-common'
import * as callme from '@oitq/plugin-callme'
import * as music from '@oitq/plugin-music'
process.on('unhandledRejection', (e) => {
    console.log(e)
})
createApp()
    .plugin(callme)
    .plugin(music)
    .plugin(common,{operator:1659488338})
    .plugin(qa)
    .plugin(schedule)
    .plugin(database,{
        dialect:'mysql',
        host:'148.70.201.93',
        database:'oitq',
        username:'root',
        password:'l196023.',
        logging:()=>{}
    })
    .start(8086)

