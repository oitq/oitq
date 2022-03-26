import {dir,App} from "oitq"
import {install as database} from '@oitq/plugin-database';
import {
    getAppConfigPath, readConfig
} from "oitq";
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

