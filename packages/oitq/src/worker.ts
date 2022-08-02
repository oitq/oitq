const {App} = require("./");
const config=App.readConfig(process.env.configPath)
const app=global.__OITQ__=new App(config)
app.start()
function handleException(error) {
    console.error(error)
    process.exit(1)
}

process.on('uncaughtException', handleException)

process.on('unhandledRejection', (error) => {
    console.warn(error)
})
