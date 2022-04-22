import {createApp} from "oitq"
process.on('unhandledRejection', (e) => {
    console.log(e)
})
createApp('oitq.json').start(8086)

