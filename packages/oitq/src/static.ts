import {App} from "./app";

export const dir = process.cwd()
export const defaultAppConfig:App.Config={
    bots:[],
    maxListeners:50,
    logLevel:'info',
    plugins:{},
    delay:{
        prompt:60000
    }
}
