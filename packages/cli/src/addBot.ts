import axios from "axios";
import {Choice, PromptObject} from 'prompts'
import * as path from "path";
import {CAC} from "cac";
import {
    dir,
    defaultOneBotConfig, OneBotConfig,getOneBotConfigPath,
    defaultBotOptions, BotOptions,getBotConfigPath,
    defaultAppOptions, AppOptions,getAppConfigPath,
    readConfig, writeConfig,
} from "oitq";
import {createIfNotExist} from "@oitq/utils";
const prompts = require('prompts')
function createQuestion<T extends Record<string, any>>(fields: (keyof T)[],item:T): PromptObject[] {
    return fields.map((field, index) => {
        let type: string = typeof item[field]
        if (type === 'object' && Array.isArray(item[field])) type = 'array'
        return <PromptObject>{
            type: type === 'boolean' ? 'confirm' : type === 'string' ? 'text' : type === 'number' ? 'number' : "list",
            name: field,
            message: `${type !== 'boolean' ? '请输入' : ''}${field}${type === 'boolean' ? '?' : ''}：${type === 'array' ? '(使用空格分隔每一项)' : ''}`,
            initial: type === 'array' ? (item[field] as string[]).join('') : item[field],
            separator: ' '
        }
    })
}

export async function addBot() {
    let msg

    createIfNotExist(path.join(dir,'configFilePath'),dir)
    const dirReal=readConfig(path.join(dir,'configFilePath'))
    createIfNotExist(getAppConfigPath(dirReal),defaultAppOptions)
    createIfNotExist(getOneBotConfigPath(dirReal),defaultOneBotConfig)
    createIfNotExist(getBotConfigPath(dirReal),defaultBotOptions)
    const appOptions: AppOptions = readConfig(getAppConfigPath(dirReal))
    const botOptions:BotOptions=readConfig(getBotConfigPath(dirReal))
    const oneBotConfig: OneBotConfig = readConfig(getOneBotConfigPath(dirReal))
    const botConfigQuestion:PromptObject[]=[
        {
            type: 'number',
            name: 'uin',
            message: '请输入bot uin'
        },
        {
            type:'confirm',
            name:'isUseDefaultBotConfig',
            message:`是否使用默认bot配置？(默认配置见${getBotConfigPath(dirReal)})`,
            initial:true
        },
        {
            type:(prev)=>prev?null:"multiselect",
            name:'botConfigFields',
            message:'请选择需要更改的bot配置项',
            choices:Object.keys(botOptions).filter(key=>key!=='uin').map(key=>({title:key,value:key}))
        },
    ]
    const loginQuestion:PromptObject[]=[
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
            type: (prev,answers) => answers.useOneBot&&prev ? "multiselect" : null,
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

    const request = axios.create({baseURL: `http://127.0.0.1:${appOptions.port || 8080}`})
    const result = await prompts(botConfigQuestion, {
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
    if(result.isUseDefaultBotConfig){
        Object.assign(result,botOptions)
    }else{
        const newBotConfig=await prompts(createQuestion(result.botConfigFields,botOptions),{
            onCancel() {
                throw new Error('主动结束，流程结束')
            }
        })
        Object.assign(result,newBotConfig)
        const {isSave}=await prompts({
            type:'confirm',
            name:'isSave',
            message:'是否保存到配置？',
            initial:true
        })
        if(isSave){
            writeConfig(getBotConfigPath(dirReal),{...botOptions,...newBotConfig})
        }
    }
    const loginInfo=await prompts(loginQuestion,{
        onCancel() {
            throw new Error('主动结束，流程结束')
        }
    })
    Object.assign(result,loginInfo)
    if (result.useOneBot) {
        if (result.useDefaultOneBot) {
            result.oneBot = oneBotConfig
        } else {
            const newDefault = await prompts(createQuestion(result.configFields,oneBotConfig), {
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
                writeConfig(getOneBotConfigPath(dirReal), {...defaultOneBotConfig, ...newDefault})
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
    const botConfig: BotOptions = {
        uin: result.uin,
        type: result.type,
        password: result.password,
        config: result.config,
        oneBot: result.oneBot || false
    }
    appOptions.bots.push(botConfig)
    if (appOptions.start) {
        const {loginNow} = await prompts({
            type:'confirm',
            name:'loginNow',
            message:'是否立即登录？',
            initial:true
        })
        if(loginNow)await request.post('/add', result)
    }
    writeConfig(getAppConfigPath(dirReal), appOptions)
    console.log('配置已保存，下次启动时将自动登录该账号')
}

export default function registerAddBotCommand(cli: CAC) {
    cli.command('add', '新增bot')
        .action(async ()=>{
            try{
                await addBot()
            }catch (e){
                console.log(e.message)
            }
        })
}
