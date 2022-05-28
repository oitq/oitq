import {Router} from "../router";
import {App} from "oitq";
import {createBotApi} from "./bot";

export function bindApis(router:Router,app:App){
    createBotApi.call(app,router)
    router.get('/hello',(ctx)=>{
        ctx.res.writeHead(200).end('hello world')
    })
}
