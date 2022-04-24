import {createApp} from "oitq"
process.on('unhandledRejection', (e) => {
    console.log(e)
})
createApp().start(8086)

