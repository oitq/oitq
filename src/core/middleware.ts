import {Sendable} from "oicq";
import {NSession} from "@/core/bot";
import {Promisify} from "@/utils/types";

export type Middleware=(session:NSession<'message'>)=>Promisify<boolean|Sendable|void>
