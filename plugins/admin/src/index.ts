import {OitqPlugin} from "oitq";
const plugin=new OitqPlugin('admin',__dirname)
plugin
    .command('oitq <varName:string> [newVal:string]','all')
    .action(async ({session}, varName,newVal)=>{

    })
