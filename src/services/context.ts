import { AsyncLocalStorage }  from "node:async_hooks";
import type {RequestContext} from "../types/type.js"
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

function getLocalStorage():RequestContext{
    const store = asyncLocalStorage.getStore();
    if(!store) throw new Error("No request context available");
    return store;
}
export {asyncLocalStorage, getLocalStorage};