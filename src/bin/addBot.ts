import axios from "axios";
import {Choice, PromptObject} from 'prompts'
import {CAC} from "cac";
import {defaultOneBotConfig, OneBotConfig} from "@/onebot";
import {BotOptions, defaultBotOptions} from "@/core/bot";
import {AppOptions} from "@/core/app";
import {getAppConfigPath, getOneBotConfigPath, readConfig, writeConfig} from "@/utils/functions";
import {dir} from "@/bin/index";

const prompts = require('prompts')
const appOptions: AppOptions = readConfig(getAppConfigPath(dir))
const oneBotConfig: OneBotConfig = readConfig(getOneBotConfigPath(dir))
const request = axios.create({baseURL: `http://127.0.0.1:${appOptions.port || 8080}`})
const questions: PromptObject[] = [
    {
        type: 'number',
        name: 'uin',
        message: '请输入bot uin'
    },
    {
        type: 'select',
        name: 'type',
        message: "请选择登录方式",
        choices: [
            {title: '密码登录', description: '使用密码登录', value: 'password'},
            {title: '扫码登录', value: 'qrcode'},
        ],
        initial: 1
    }, {
        type: prev => prev === 'password' ? 'password' : null,
        name: 'password',
        message: '请输入密码'
    }, {
        type: 'confirm',
        name: 'useOneBot',
        message: "是否启用OneBot？",
        initial: true
    }, {
        type: prev => prev === true ? "confirm" : null,
        name: "useDefaultOneBot",
        message: "是否使用默认OneBot配置",
        initial: true
    }, {
        type: prev => prev === false ? "multiselect" : null,
        name: 'configFields',
        message: '请选择需要更改的默认配置项',
        choices: Object.keys(oneBotConfig).map(key => ({title: key, value: key}))
    }
]
const configQuestions: PromptObject[] = [
    {
        type: 'select',
        name: 'platform',
        message: '请选择登录平台',
        choices: [
            {title: 'android', value: 1},
            {title: 'aPad', value: 2},
            {title: 'aWatch', value: 3},
            {title: 'MacOS', value: 4},
            {title: 'iPad', value: 5}
        ],
        initial: 0
    },
    {
        type: 'select',
        name: 'log_level',
        message: '请选择日志等级',
        choices: ["trace", "debug", "info", "warn", "error", "fatal", "mark", "off"].map((name) => <Choice>({
            title: name,
            value: name
        })),
        initial: 2
    }
]

function createQuestion(fields: (keyof OneBotConfig)[]): PromptObject[] {
    return fields.map((field, index) => {
        let type: string = typeof oneBotConfig[field]
        if (type === 'object' && Array.isArray(oneBotConfig[field])) type = 'array'
        return <PromptObject>{
            type: type === 'boolean' ? 'confirm' : type === 'string' ? 'text' : type === 'number' ? 'number' : "list",
            name: field,
            message: `${type !== 'boolean' ? '请输入' : ''}${field}${type === 'boolean' ? '?' : ''}：${type === 'array' ? '(使用空格分隔每一项)' : ''}`,
            initial: type === 'array' ? (oneBotConfig[field] as string[]).join('') : oneBotConfig[field],
            separator: ' '
        }
    })
}

export async function addBot() {
    let msg
    const result = await prompts(questions, {
        onSubmit(p, answer, answers) {
            if (answers.uin && appOptions.bots.find(bot => bot.uin === answers.uin)) {
                msg=`机器人${answers.uin} 已存在`
                throw new Error()
            }
        },
        onCancel(){
            if(msg)throw new Error(msg)
            else throw new Error('主动结束，流程结束')
        }
    })
    if (result.useOneBot) {
        if (result.useDefaultOneBot) {
            result.oneBot = oneBotConfig
        } else {
            const newDefault = await prompts(createQuestion(result.configFields), {
                onCancel() {
                    throw new Error('主动结束，流程结束')
                }
            })
            result.oneBot = {...oneBotConfig, ...newDefault}
            const {saveDefault} = await prompts({
                type: 'confirm',
                name: 'saveDefault',
                message: '是否将此默认配置更新到OneBot默认配置文件？'
            }, {
                onCancel() {
                    throw new Error('主动结束，流程结束')
                }
            })
            if (saveDefault) {
                writeConfig(getOneBotConfigPath(dir), {...defaultOneBotConfig, ...newDefault})
            }
        }
    }
    const {confClient} = await prompts({
        type: 'confirm',
        name: 'confClient',
        initial: false,
        message: "是否设置客户端config？(默认不设置，使用默认配置)"
    }, {
        onCancel() {
            throw new Error('主动结束，流程结束')
        }
    })
    if (confClient) {
        const newDefaultConfig = await prompts(configQuestions, {
            onCancel() {
                throw new Error('主动结束，流程结束')
            }
        })
        result.config = {...newDefaultConfig}
    } else {
        result.config = defaultBotOptions.config
    }
    const botOptions: BotOptions = {
        uin: result.uin,
        type: result.type,
        password: result.password,
        config: result.config,
        oneBot: result.oneBot || false
    }
    appOptions.bots.push(botOptions)
    if (appOptions.start) {
        const {loginNow} = await prompts({
            type:'confirm',
            name:'loginNow',
            message:'是否立即登录？',
            initial:true
        })
        if(loginNow)await request.post('/add', result)
    }
    writeConfig(getAppConfigPath(dir), appOptions)
    console.log('配置已保存，下次启动时将自动登录该账号')
}

export default function registerAddBotCommand(cli: CAC) {
    cli.command('add', '新增bot')
        .action(addBot)
}
