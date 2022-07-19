import {App} from "./app";
let app:App
const config=App.readConfig(process.env.configPath)
app=global.__OITQ__=new App(config)
app.start()
function handleException(error: any) {
    console.error(error)
    process.exit(1)
}

process.on('uncaughtException', handleException)

process.on('unhandledRejection', (error) => {
    console.warn(error)
})
