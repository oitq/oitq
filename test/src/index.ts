// @ts-ignore
import {createApp} from "oitq"
import * as database from '@oitq/plugin-database'
import * as qa from '@oitq/plugin-qa'
import * as schedule from '@oitq/plugin-schedule'
import * as common from '@oitq/plugin-common'
process.on('unhandledRejection', (e) => {
    console.log(e)
})
createApp()
    .plugin((ctx)=>{
        // do sth
    })
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

