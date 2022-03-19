import {App} from "../src";
import {dir, getAppConfigPath, readConfig} from "../src";

process.on('unhandledRejection', (e) => {
    console.log(e)
})
process.on('uncaughtException', (e) => {
    console.log(e)
})
const app = new App(readConfig(getAppConfigPath(dir)))
app.start(8086)
app.on('bot.message', async (session) => {
    if (session.raw_message === 'mm') {
        const result2 = await session.prompt([
            {name: 'name', type: 'text', label: '用户名'},
            {name: 'age', type: 'number', label: '年龄'},
            {name: 'sex', type: 'select', label: '性别', choices: [{title: '男', value: 1}, {title: '女', value: 0}]},
            {name: 'isWork', type: 'confirm', label: '是否工作'},
            {
                name: 'class', type: 'multipleSelect', label: '所在班级', choices: [
                    {title: '计较201601',value: 't01'},
                    {title: '计较201602',value: 't02'},
                    {title: '计较201603',value: 't03'},
                ],
                initial:'t01',
                separator: ','
            },
            {name: 'like',type: 'list',label: '兴趣爱好',separator:','}

        ])
        console.log(result2)
    }

})
