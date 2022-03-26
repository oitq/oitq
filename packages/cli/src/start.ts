import {CAC} from "cac";
import {App,dir,
    defaultAppOptions,AppOptions,getAppConfigPath,
    readConfig,writeConfig
} from "oitq";
import {addBot} from "./addBot";
import {merge} from "@oitq/utils";


export default function registerStartCommand(cli: CAC) {
    let appOptions: AppOptions = readConfig(getAppConfigPath(dir))
    cli.command('start','启动项目')
        .action(async () => {
            try {
                if (appOptions.bots.length == 0) {
                    console.log('首次启动，请配置一个账号')
                    await addBot()
                    appOptions = merge(defaultAppOptions,await readConfig(getAppConfigPath(dir)))
                }
                const app = new App(appOptions)
                await app.start()
                appOptions.start = true
                writeConfig(getAppConfigPath(dir), appOptions)
            } catch (e) {
                console.log(e.message)
            }
        })
}
