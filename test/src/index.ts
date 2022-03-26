import {dir,App,getAppConfigPath, readConfig} from "oitq"
import {install as database} from '@oitq/plugin-database';
process.on('unhandledRejection', (e) => {
    console.log(e)
})
process.on('uncaughtException', (e) => {
    console.log(e)
})
const app = new App(readConfig(getAppConfigPath(dir)))
app.plugin(database,{dialect:'mysql'})
console.log(app.database)
app.start(8086)

