import { ChildProcess, fork } from 'child_process'
import { resolve } from 'path'
import { CAC } from 'cac'
import * as path from 'path'
import {
    dir,
    hyphenate,
    defaultAppConfig, App, getAppConfigPath,
    readConfig, writeConfig,  getBotConfigPath, defaultBotConfig,
    Dict
} from "oitq";
import {createIfNotExist} from "@oitq/utils";
const prompts = require('prompts')

let child: ChildProcess

process.on('SIGINT', () => {
    if (child) {
        child.emit('SIGINT')
    } else {
        process.exit()
    }
})

interface Message {
    type: 'start' | 'queue'
    body: any
}

let buffer = null

function toArg(key: string) {
    return key.length === 1 ? `-${key}` : `--${hyphenate(key)}`
}
function createWorker(options: Dict<any>) {
    const execArgv = Object.entries(options).flatMap<string>(([key, value]) => {
        if (key === '--') return []
        key = toArg(key)
        if (value === true) {
            return [key]
        } else if (value === false) {
            return ['--no-' + key.slice(2)]
        } else if (Array.isArray(value)) {
            return value.flatMap(value => [key, value])
        } else {
            return [key, value]
        }
    })
    execArgv.push(...options['--'])
    child = fork(resolve(__dirname, 'worker'), [], {
        execArgv,
    })

    let config: { autoRestart: boolean }

    child.on('message', (message: Message) => {
        if (message.type === 'start') {
            config = message.body
            if (buffer) {
                child.send({ type: 'send', body: buffer })
                buffer = null
            }
        } else if (message.type === 'queue') {
            buffer = message.body
        }
    })

    /**
     * https://tldp.org/LDP/abs/html/exitcodes.html
     * - 0: exit manually
     * - 51: restart (magic code)
     * - 130: SIGINT
     * - 137: SIGKILL
     */
    const closingCode = [0, 130, 137]

    child.on('exit', (code) => {
        if (!config || closingCode.includes(code) || code !== 51 && !config.autoRestart) {
            process.exit(code)
        }
        createWorker(options)
    })
}
function setEnvArg(name: string, value: string | boolean) {
    if (value === true) {
        process.env[name] = ''
    } else if (value) {
        process.env[name] = value
    }
}
export default function registerStartCommand(cli: CAC) {
    cli.command('start [configPath]','启动项目')
        .alias('run')
        .allowUnknownOptions()
        .option('--log-level [level]', 'specify log level (default: off)')
        .option('--watch [path]', 'watch and reload at change')
        .action(async (configPath,options) => {
            const { logLevel, watch, ...rest } = options
            if(!configPath)configPath=dir
            else configPath=path.join(process.cwd(),configPath)
            createIfNotExist(path.join(dir,'configFilePath'),configPath)
            writeConfig(path.join(dir,'configFilePath'),configPath)
            createIfNotExist(getAppConfigPath(configPath),defaultAppConfig)
            createIfNotExist(getBotConfigPath(configPath),defaultBotConfig)
            let appOptions: App.Config = readConfig(getAppConfigPath(configPath))
            try {
                appOptions.start = true
                setEnvArg('OITQ_WATCH_ROOT', watch)
                writeConfig(getAppConfigPath(configPath), appOptions)
                process.env.OITQ_LOG_LEVEL = logLevel || 'off'
                process.env.OITQ_CONFIG_FILE = getAppConfigPath(configPath) || ''
                createWorker(rest)
            } catch (e) {
                console.log(e.message)
            }
        })
}
