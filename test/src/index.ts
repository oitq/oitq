import {dir,App} from "oitq"
import {install as database} from '@oitq/plugin-database';
import {install as test123} from '@oitq/plugin-test123'
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
app.plugin(test123,{dialect:'mysql'})
console.log(app.database)
console.log(app.test123)
app.start(8086)

