import {Sendable} from "oicq";
import {NSession} from ".";
import {Awaitable} from "@oitq/utils";

export type Middleware=(session:NSession<'message'>)=>Awaitable<boolean|Sendable|void>
