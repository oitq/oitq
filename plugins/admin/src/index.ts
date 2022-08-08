import {OitqPlugin} from "oitq";
const plugin=new OitqPlugin('admin',__dirname)
plugin
    .command('oitq <varName:string> [newVal:string]','all')
    .desc('打印当前配置文件变量')
    .action(async ({session}, varName,newVal)=>{
        return
    })
