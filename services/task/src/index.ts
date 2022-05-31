import {Service, Plugin, Prompt, template, NSession} from "oitq";
import {TaskStep, Task} from "./model";
import {options} from "tsconfig-paths/lib/options";
import {Model} from "sequelize";

interface TaskWithSteps extends Task {
    steps?: TaskStep[]
}

template.set('task', {
    list: `相关任务：\n{0}`,
    info: '任务id:{0}\n任务名:{1}\n任务描述:{2}\n',
    step: '第{0}步:{1}',
    steps: '执行指令详情:\n{0}'
})
declare module 'oitq' {
    namespace Plugin {
        interface Services {
            tasks: Tasks
        }
    }
}

export interface Pagination {
    pageSize: number
    pageNum: number
}

export default class Tasks extends Service {
    static using: readonly (keyof Plugin.Services)[] = ['database']

    constructor(plugin: Plugin) {
        super(plugin, 'tasks', true);
        plugin.app.before('database.ready', () => {
            plugin.database.define('Task', Task)
            plugin.database.define('TaskStep', TaskStep)
        })
        plugin.app.before('database.sync', () => {
            const {Task, TaskStep} = plugin.database.models
            Task.hasMany(TaskStep, {as: 'steps'})
            TaskStep.belongsTo(Task)
        })
    }

    get taskModel() {
        return this.plugin.database.models.Task
    }

    get stepModel() {
        return this.plugin.database.models.TaskStep
    }

    async changeTask(data: TaskWithSteps): Promise<TaskWithSteps> {
        const {steps = [], ...task} = data
        let taskInstance: Model
        if (task.id) {
            taskInstance = await this.taskModel.findOne({where: {id: task.id}})
        } else {
            taskInstance = await this.taskModel.create({...task})
        }
        await taskInstance.update(task)
        if (steps.length) {
            const stepInstances = await this.stepModel.bulkCreate(steps as unknown as any)
            // @ts-ignore
            taskInstance.setSteps(stepInstances)
        }
        return taskInstance.toJSON()
    }

    query(condition: string | Partial<Task> = {}, pagination: Pagination = {pageNum: 1, pageSize: 15}) {
        if (typeof condition === 'string') condition = {name: condition}
        Object.keys(condition).forEach(key => {
            condition[key] = `%${condition[key]}%`
        })
        return this.list(condition, pagination)
    }

    async list(query: Partial<Task> = {}, pagination: Pagination = {pageNum: 1, pageSize: 15}) {
        const offset = (pagination.pageNum - 1) * pagination.pageSize
        return (await this.taskModel.findAll({
            where: query,
            offset,
            limit: pagination.pageSize,
        })).map(_ => _.toJSON()) as Task[]
    }

    async detail(id: number) {
        return (await this.taskModel.findOne({
            where: {id},
            include: {model: this.stepModel, as: 'steps'}
        })).toJSON() as TaskWithSteps
    }

    async modifyTask(session: NSession, id?: number) {
        const questions: Prompt.Options<any>[] = [
            {
                type: 'text',
                message: '请输入任务名称',
                name: 'name'
            },
            {
                type: 'text',
                message: '请输入任务描述',
                name: 'desc'
            }
        ]
        let stepAddFinished: boolean = false
        const task: TaskWithSteps = (await session.prompt(questions)) as Task
        if (!task) return '输入超时'
        while (!stepAddFinished) {
            const steps = task.steps ||= []
            const step = await session.prompt([
                {
                    type: 'text',
                    message: `第${steps.length + 1}步：\n请输入需要执行的指令`,
                    name: 'template'
                },
                {
                    type: 'confirm',
                    message: `是否继续添加`,
                    name: 'hasMore'
                }
            ]) as Record<string, any>
            if (!step) return '输入超时'
            steps.push({index: steps.length + 1, template: step.template})
            if (!step.hasMore) break;
        }
        return await this.changeTask({id, creator: session.user_id, ...task})
    }

    start() {
        this.plugin.command('task [id:integer]', 'message')
            .desc('任务管理')
            .option('list', '-l 查看已有任务', {initial: true})
            .option('pageNum', '/ <pageNum:integer> 查看指定页', {initial: 1})
            .option('search', '-s <keyword:string> 搜索指定名称的任务')
            .option('remove', '-r 移除指定任务')
            .shortcut(/^删除任务(\d+)$/, {options: {remove: true}, args: ['$1']})
            .auth(4)
            .action(async ({options, session}, id) => {
                if (options.remove) {
                    if (!id) return '未指定任务id'
                    await this.taskModel.destroy({where: {id}})
                    return `已删除任务${id}`
                }
                const condition: Partial<Task> = {},
                    pagination: Pagination = {pageNum: options.pageNum || 1, pageSize: 15}
                if (options.search) condition.name = options.search
                const result = await this.query(condition, pagination)
                return template('task.list', result.map(task => template('task.info', task.id, task.name, task.desc)).join('\n'))
            })
        this.plugin.command('task/task.add', 'message')
            .desc('新增任务')
            .shortcut('新增任务')
            .auth(4)
            .action(async ({session}, name) => {
                const result = await this.modifyTask( session)
                if (typeof result === 'string') return result
                return `添加任务(${result.id})成功`
            })
        this.plugin.command('task/task.edit [id:integer]', 'message')
            .desc('编辑任务')
            .shortcut('编辑任务')
            .auth(4)
            .action(async ({session}, id) => {
                const result = await this.modifyTask( session, id)
                if (typeof result === 'string') return result
                return `编辑任务(${result.id})成功`
            })
        this.plugin.command('task/task.info [id:integer]', 'message')
            .desc('查看任务详情')
            .shortcut(/^查看任务(\d+)/, {args: ['$1']})
            .auth(4)
            .action(async ({session}, id) => {
                const task = await this.detail(id)
                if (!task) return `无效的任务id(${id})`
                return template('task.info', task.id, task.name, task.desc) + template('task.steps', (task.steps || []).map(step => {
                    return template('task.step', step.index, step.template)
                }).join('\n'))
            })
        this.plugin.command('task/task.run [id:integer]', 'message')
            .desc('执行指定任务')
            .shortcut(/^执行任务(\d+)/, {args: ['$1']})
            .auth(4)
            .action(async ({session}, id) => {
                const task = await this.detail(id)
                if (!task) return `无效的任务id(${id})`
                await session.sendMsg(`正在执行任务${id}...`)
                for (const step of task.steps) {
                    try {
                        await session.executeTemplate(step.template)
                    } catch (e) {
                        return e.message
                    }
                }
                return `任务执行完成`
            })
    }
}
