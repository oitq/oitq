import {App} from "../app";
import {NSession} from '../bot'
import {Command} from '../command'

import {template} from "@oitq/utils";

interface HelpOptions {
    showHidden?: boolean
}

export function enableHelp<A extends any[], O extends {}>(cmd: Command<A, O>) {
    return cmd.option('help', '-h', {
        hidden: true,
    })
}




export function getCommandNames(session: NSession<'message'>) {
    return [...session.app.pluginManager.plugins.values()].map(plugin=>plugin.commandList).flat()
        .filter(cmd => cmd.match(session))
        .flatMap(cmd => cmd.aliasNames)
}

function* getCommands(session: NSession<'message'>, commands: Command[], showHidden = false): Generator<Command> {
    for (const command of commands) {
        if (command.match(session)) {
            yield command
        } else {
            yield* getCommands(session, command.children, showHidden)
        }
    }
}

function formatCommands(path: string, session: NSession<'message'>, children: Command[], options: HelpOptions) {
    const commands = Array
        .from(getCommands(session, children, options.showHidden))
        .sort((a, b) => a.name > b.name ? 1 : -1)
    if (!commands.length) return []

    let hasSubcommand = false
    const output = commands.map(({name, descriptions}) => {
        let output = '    ' + name
        output += '  ' + descriptions.join('\n')
        return output
    })
    const hints: string[] = []
    if (hasSubcommand) hints.push(template('internal.hint-subcommand'))
    output.unshift(template(path, [template.brace(hints)]))
    return output
}


function getOptions(command: Command,config:HelpOptions) {
    const options = config.showHidden
        ? Object.values(command.options)
        : Object.values(command.options).filter(option => {
            console.log(option)
            return option.hidden!==true
        })
    if (!options.length) return []

    const output = [template('internal.available-options')]

    options.forEach((option) => {
        output.push(`${option.name},${option.description}`)
    })

    return output
}

async function showHelp(command: Command, session: NSession<'message'>, config: HelpOptions) {
    const output = [command.name +'     '+ command.descriptions.join()]

    if (command.aliasNames.length) {
        output.push(template('internal.command-aliases', command.aliasNames.join('，')))
    }


    output.push(...getOptions(command,config))

    if (command.examples.length) {
        output.push(template('internal.command-examples'), ...command.examples.map(example => '    ' + example))
    }

    output.push(...formatCommands('internal.subcommand-prolog', session, command.children, config))

    return output.filter(Boolean).join('\n')
}

/* eslint-disable quote-props */
template.set('internal', {
    // command
    'low-authority': '权限不足。',
    'usage-exhausted': '调用次数已达上限。',
    'too-frequent': '调用过于频繁，请稍后再试。',
    'insufficient-arguments': '缺少参数，输入帮助以查看用法。',
    'redunant-arguments': '存在多余参数，输入帮助以查看用法。',
    'invalid-argument': '参数 {0} 输入无效，{1}',
    'unknown-option': '存在未知选项 {0}，输入帮助以查看用法。',
    'invalid-option': '选项 {0} 输入无效，{1}',
    'check-syntax': '输入帮助以查看用法。',

    // parser
    'invalid-number': '请提供一个数字。',
    'invalid-integer': '请提供一个整数。',
    'invalid-posint': '请提供一个正整数。',
    'invalid-natural': '请提供一个非负整数。',
    'invalid-date': '请输入合法的时间。',
    'invalid-user': '请指定正确的用户。',
    'invalid-channel': '请指定正确的频道。',

    // suggest
    'suggestion': '您要找的是不是{0}？',
    'command-suggestion-prefix': '',
    'command-suggestion-suffix': '发送空行或句号以使用推测的指令。',

    // help
    'help-suggestion-prefix': '指令未找到。',
    'help-suggestion-suffix': '发送空行或句号以使用推测的指令。',
    'subcommand-prolog': '可用的子指令有{0}：',
    'global-help-prolog': '当前可用的指令有{0}：',
    'global-help-epilog': '输入“帮助 指令名”查看特定指令的语法和使用示例。',
    'available-options': '可用的选项有：',
    'available-options-with-authority': '可用的选项有（括号内为额外要求的权限等级）：',
    'option-not-usage': '（不计入总次数）',
    'hint-authority': '括号内为对应的最低权限等级',
    'hint-subcommand': '标有星号的表示含有子指令',
    'command-aliases': '别名：{0}。',
    'command-examples': '使用示例：',
    'command-authority': '最低权限：{0} 级。',
    'command-max-usage': '已调用次数：{0}/{1}。',
    'command-min-interval': '距离下次调用还需：{0}/{1} 秒。',
})

export function install(app: App) {
    app.on('command.add', (cmd:Command) => cmd.use(enableHelp))
    app.before('command', async ({command, session, options}) => {
        if (!command) return
        if (command['actions'].length && !options['help']) return
        return await session.execute(`help ${command.name}`)
    })

    app.command('help [command]', 'message')
        .desc('显示帮助信息')
        .shortcut('帮助')
        .option('authority', '-a  显示权限设置')
        .option('showHidden', '-H  查看隐藏的选项和指令')
        .action(async ({session, options}, target) => {
            if (!target) {
                const commands = app.commands.filter(cmd => cmd.parent === null)
                const output = formatCommands('internal.global-help-prolog', session, commands, options)
                const epilog = template('internal.global-help-epilog')
                if (epilog) output.push(epilog)
                return output.filter(Boolean).join('\n')
            }

            const command = app.findCommand({name:target,source:session.cqCode,},app.commands)
            if (!command?.match(session)) {
                return
            }

            return showHelp(command, session, options)
        })
}
