#!/usr/bin/env node

"use strict";
const {CAC}=require('cac')
const {version}=require('./package.json')
const path=require('path')
const fs = require('fs')
const {start,App}=require('./lib')
const cac=new CAC('oitq').version(version)
function upperFirst(str){
    return str.slice(0,1).toUpperCase() +str.slice(1).toLowerCase();
}
function packageTemplate(type,name){
    return {
        "name": `oitq-${type}-${name}`,
        "version": "0.0.1",
        "description": `oitq ${name} ${type}`,
        "main": "index.js",
        "license": "MIT",
        "files": [
            "lib/**/*.js",
            "lib/**/*.d.ts",
            "lib/**/LICENSE",
            "index.html",
            "README.md",
            "dist/**/*",
            "client/**/*"
        ],
        "dependencies": {
        },
        "devDependencies": {
        }
    }
}
cac.command('start [filePath]','启动Oitq服务')
.action((filePath='oitq.yaml')=>{
    start(filePath)
})
cac.command('new <name>','新建模块')
    .option('--type <type>','仓库类型，可选项:service,plugin,adapter。默认:plugin',{default:'plugin'})
    .action((name,{type})=>{
        let config=App.readConfig()||{plugin_dir:'plugins',service_dir:'services',adapter_dir:'adapters'}
        const root=path.resolve(process.cwd(),config[`${type}_dir`])
        const base=path.join(root,name)
        if(fs.existsSync(base)) throw new Error('目录已存在')
        fs.mkdirSync(base)
        fs.writeFileSync(path.join(base,'package.json'),JSON.stringify(packageTemplate(type,name),null,4))
        fs.writeFileSync(path.join(base,'index.js'),
`
const {${upperFirst(type)}} = require('oitq');

const ${name} = new ${upperFirst(type)}('${name}', __filename)
// 在这里编写你的代码
`)
    })
