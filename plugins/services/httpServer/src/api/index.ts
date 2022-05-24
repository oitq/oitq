import {Router} from "../router";
import {App} from "oitq";
import {createBotApi} from "./bot";

export function bindApis(router:Router,app:App){
    createBotApi.call(app,router)
}
