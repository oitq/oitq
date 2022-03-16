import {App,AppOptions} from '../src'
import * as fs from 'fs'
import * as path from "path";
const configPath=path.join(process.cwd(),'oicq.config.json')
const appOption:AppOptions=JSON.parse(fs.readFileSync(configPath,{encoding:"utf-8"}))
const app=new App(appOption)
app.start(8086)
