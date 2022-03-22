import {Sendable} from "oicq";
import {NSession} from "@/core";
import {Awaitable} from "@/utils";

export type Middleware=(session:NSession<'message'>)=>Awaitable<boolean|Sendable|void>
