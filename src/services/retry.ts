import { ApiError } from "@google/genai";
import { APIError } from "groq-sdk"
import { info } from "./logger.js"


function isRetryable(error: unknown):boolean{
    if (error instanceof ApiError || error instanceof APIError) {
        return error.status === 500 || error.status === 503 || error.status === 429;
    }

    const networkError = error as {
        code?: string;
        cause?: { code?: string };
        message?: string;
    };
    const networkCodes = [
        "ENETUNREACH",
        "ENETDOWN",
        "ECONNRESET",
        "ECONNREFUSED",
        "ENOTFOUND",
        "ETIMEDOUT",
        "EAI_AGAIN",
    ];

    return networkCodes.includes(networkError.code ?? "")
        || networkCodes.includes(networkError.cause?.code ?? "")
        || networkError.message === "fetch failed";
}
async function withRetry<T>(fn:()=>Promise<T>, provider:string){
    const DELAY = 1000;
    const MAX_ATTEMPTS = 4;
    let lastError:unknown;
    for(let i=1; i<=MAX_ATTEMPTS; i++){
        try{
            return await fn();
        }catch(error){
            
            lastError = error;
            if(isRetryable(error) && i < MAX_ATTEMPTS){
                const message = error instanceof Error ? error.message : String(error);
                info(`${provider} failed to generate response ${i}/${MAX_ATTEMPTS} attempts, Reason: ${message}, retrying in ${DELAY / 1000}s....`);//Printing the log
                await new Promise(r=>setTimeout(r,DELAY*i));// r is nothing, this is just used to pause the execition for DELAY ms
            }else{
                console.log('___NETWORK ERROR____',error);
                throw error;
            }
        }
    } 
    throw lastError;
}
export {withRetry};