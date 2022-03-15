import {CAC} from "cac";
import * as fs from "fs";
import * as path from "path";
import {App, AppOptions} from "@/app";
const appConfigPath=path.join(process.cwd(),'oicq.config.json')
const appOptions:AppOptions=JSON.parse(fs.readFileSync(appConfigPath,{encoding:"utf-8"}))
export default function registerStartCommand(cli:CAC){
    cli.command('start')
        .action(()=>{
            const app=new App(appOptions)
            app.start()
            appOptions.start=true
            fs.writeFileSync(appConfigPath,JSON.stringify(appOptions),{encoding:"utf-8"})
        })
}
