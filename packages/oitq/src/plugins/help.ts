import {App, BotEventMap, Command, NSession, OitqPlugin,template} from "oitq";
import {Argv} from "../argv";
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
    'check-syntax': '输入"help"查看指令菜单。',

    // parser
    'invalid-number': '无效的数字。',
    'invalid-integer': '无效的整数。',
    'invalid-posint': '无效的正整数。',
    'invalid-natural': '无效的非负整数。',
    'invalid-date': '无效的日期。',

    // suggest
    'suggestion': '您要找的是不是{0}？',
    'command-suggestion-prefix': '',
    'command-suggestion-suffix': '发送空行或句号以使用推测的指令。',

    // help
    'help-suggestion-prefix': '没有匹配的指令。',
    'help-suggestion-suffix': '发送空行或句号以使用推测的指令。',
    'subcommand-prolog': '子指令{0}：',
    'global-help-prolog': '相关指令{0}：',
    'global-help-epilog': '回复“帮助 指令名”以查看对应指令帮助。',
    'available-options': '可选项：',
    'option-not-usage': '（不计入总次数）',
    'hint-authority': '括号内为对应的最低权限等级',
    'hint-subcommand': '标有星号的表示含有子指令',
    'command-aliases': '别名：{0}。',
    'command-examples': '样例：',
    'command-authority': '最低权限：{0} 级。',
    'command-max-usage': '已调用次数：{0}/{1}。',
    'command-min-interval': '距离下次调用还需：{0}/{1} 秒。',
})


interface HelpOptions {
    showHidden?: boolean
    authority?: boolean
}
async function showHelp(command: Command, session: NSession<BotEventMap, App.MessageEvent>, config: HelpOptions) {
    const output = [`${command.name}${
        command.args.length ? ' ' + command.args.map(arg => {
            return arg.required ? `<${arg.variadic ? '...' : ''}${arg.name}:${arg.type}>` : `[${arg.variadic ? '...' : ''}${arg.name}:${arg.type}]`
        }).join(' ') : ''
    }     ${command.descriptions.join()}`]

    if (command.aliasNames.length) {
        output.push(template('internal.command-aliases', command.aliasNames.join(',')))
    }


    output.push(...getOptions(command, config))
    if (command.examples.length) {
        output.push(template('internal.command-examples'), ...command.examples.map(example => '    ' + example))
    }

    output.push(...formatCommands('internal.subcommand-prolog', session, command.children, config))

    return output.filter(Boolean).join('\n')
}
function* getCommands(session: NSession<BotEventMap,App.MessageEvent>, commands: Command[], showHidden = false): Generator<Command> {
    for (const command of commands) {
        if (command.match(session)) {
            yield command
        } else {
            yield* getCommands(session, command.children, showHidden)
        }
    }
}
function formatCommands(path: string, session: NSession<BotEventMap,App.MessageEvent>, children: Command[], options: HelpOptions) {
    const commands = Array
        .from(getCommands(session, children, options.showHidden))
        .sort((a, b) => a.name > b.name ? 1 : -1)
    if (!commands.length) return []

    let hasSubcommand = false
    const output = commands.map(({name, authority, descriptions}) => {
        let output = '  ' + name
        if (options.authority) output += '   ' + `(${authority})`
        output += ' ' + descriptions.join('\n')
        return output
    })
    const hints: string[] = []
    if (hasSubcommand) hints.push(template('internal.hint-subcommand'))
    output.unshift(template(path, [template.brace(hints)]))
    return output
}


function getOptions(command: Command, config: HelpOptions) {
    const options:Command.OptionConfig[] = config.showHidden
        ? Object.values(command.options)
        : Object.values(command.options).filter((option:Command.OptionConfig) => option.hidden !== true)
    if (!options.length) return []

    const output = [template('internal.available-options')]

    options.filter((option, index) => options.findIndex((opt) => opt.shortName === option.shortName) === index).forEach((option) => {
        output.push(`${option.shortName},--${option.name}${option.declaration.type === 'boolean' ? '' : option.declaration.required ? ` <${option.name}:${option.declaration.type}>` : ` [${option.name}:${option.declaration.type}]`} ${option.description}`)
    })

    return output
}
const helpOitqPlugin=new OitqPlugin('help',__filename)
helpOitqPlugin.command('help [command:string]',"all")
    .desc('显示指令的帮助信息')
    .shortcut('帮助',{fuzzy:true})
    .action(({session,options,argv},target)=>{
        if (!target) {
            const commands = helpOitqPlugin.app.commandList.filter(cmd => cmd.parent === null)
            const output = formatCommands('internal.global-help-prolog', session, commands, options)
            const epilog = template('internal.global-help-epilog')
            if (epilog) output.push(epilog)
            return output.filter(Boolean).join('\n')
        }

        const command = helpOitqPlugin.app.findCommand({name: target, source: session.cqCode,argv})
        if (!command?.match(session)) {
            return
        }

        return showHelp(command, session, options)
    })
helpOitqPlugin.on('command-add',(command)=>{
    command.option('help','-h 显示帮助信息',{hidden:true})
})
