import {Loader} from './loader';

function handleException(error: any) {
    console.error(error)
    process.exit(1)
}

process.on('uncaughtException', handleException)
import * as daemon from './daemon'
process.on('unhandledRejection', (error) => {
    console.warn(error)
})

new Loader()
    .createApp()
    .plugin(daemon, {autoRestart:true,exitCommand:true})
    .start()
