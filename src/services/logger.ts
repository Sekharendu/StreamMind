import pino from "pino"
import type { RequestContext } from "../types/type.js"
import {getLocalStorage} from "./context.js"

const log = pino();

function info(mssg:string){
    const context = getLocalStorage();
    log.info(` requestId: ${context.requestId}, chatId: ${context.chatId}, tenantId: ${context.tenantId}, startTime: ${context.startTime}, mssg: ${mssg}`);
}
export {info}