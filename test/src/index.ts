import {createApp, Plugin} from "oitq"
process.on('unhandledRejection', (e) => {
    console.log(e)
})
const plugin=new Plugin()
createApp().addPlugin(plugin).start()

