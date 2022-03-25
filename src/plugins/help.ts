import {Context, NSession} from "@/core";
import {Argv, Command} from "@lc-cn/command";
import {template} from "@/utils";

interface HelpOptions {
    showHidden?: boolean
}

export function enableHelp<A extends any[], O extends {}>(cmd: Command<A, O>) {
    return cmd.option('help', '-h', {
        hidden: true,
    })
}

interface HelpOptions {
    showHidden?: boolean
    authority?: boolean
}

export interface HelpConfig extends Command.Config {
    shortcut?: boolean
    options?: boolean
}


export function getCommandNames(session: NSession<'message'>) {
    return session.app._commandList
        .filter(cmd => cmd.match(session) && !cmd.config.hidden)
        .flatMap(cmd => cmd._aliases)
}

function* getCommands(session: NSession<'message'>, commands: Command[], showHidden = false): Generator<Command> {
    for (const command of commands) {
        if (!showHidden && command.config.hidden) continue
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
    const output = commands.map(({name, config, children, description}) => {
        let output = '    ' + name
        if (options.authority) {
            output += ` (${config.authority}${children.length ? (hasSubcommand = true, '*') : ''})`
        }
        output += '  ' + description
        return output
    })
    const hints: string[] = []
    if (options.authority) hints.push(template('internal.hint-authority'))
    if (hasSubcommand) hints.push(template('internal.hint-subcommand'))
    output.unshift(template(path, [template.brace(hints)]))
    return output
}

function getOptionVisibility(option: Argv.OptionDeclaration, session: NSession<'message'>) {
    return !session.resolveValue(option.hidden)
}

function getOptions(command: Command, session: NSession<'message'>, config: HelpOptions) {
    if (command.config.hideOptions && !config.showHidden) return []
    const options = config.showHidden
        ? Object.values(command._options)
        : Object.values(command._options).filter(option => getOptionVisibility(option, session))
    if (!options.length) return []

    const output = config.authority && options.some(o => o.authority)
        ? [template('internal.available-options-with-authority')]
        : [template('internal.available-options')]

    options.forEach((option) => {
        const authority = option.authority && config.authority ? `(${option.authority}) ` : ''
        let line = `    ${authority}${option.description}`
        output.push(line)
    })

    return output
}

async function showHelp(command: Command, session: NSession<'message'>, config: HelpOptions) {
    const output = [command.name + command.declaration]

    if (command.description) output.push(command.description)


    if (command._aliases.length > 1) {
        output.push(template('internal.command-aliases', Array.from(command._aliases.slice(1)).join('，')))
    }


    output.push(...getOptions(command, session, config))

    if (command._examples.length) {
        output.push(template('internal.command-examples'), ...command._examples.map(example => '    ' + example))
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

export function install(ctx: Context) {
    ctx.on('command-added', cmd => cmd.use(enableHelp))
    // show help when use `-h, --help` or when there is no action
    ctx.before('command', async ({command, session, options}) => {
        if (!command) return
        if (command['_actions'].length && !options['help']) return
        return await session.execute(`help ${command.name}`)
    })
    const app = ctx.app

    function findCommand(target: string) {
        const command = app._commandList.find(cmd => cmd._aliases.includes(target))
        if (command) return command
        const shortcut = app._shortcuts.find(({name}) => {
            return typeof name === 'string' ? name === target : name.test(target)
        })
        if (shortcut) return shortcut.command
    }

    ctx.command('help [command]', '显示帮助信息')
        .shortcut('帮助', {fuzzy: true})
        .option('authority', '-a  显示权限设置')
        .option('showHidden', '-H  查看隐藏的选项和指令')
        .action(async ({session, options}, target) => {
            if (!target) {
                const commands = app._commandList.filter(cmd => cmd.parent === null)
                const output = formatCommands('internal.global-help-prolog', session, commands, options)
                const epilog = template('internal.global-help-epilog')
                if (epilog) output.push(epilog)
                return output.filter(Boolean).join('\n')
            }

            const command = findCommand(target)
            if (!command?.context.match(session)) {
                return
            }

            return showHelp(command, session, options)
        })
}
