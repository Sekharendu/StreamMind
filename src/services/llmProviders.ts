import { defaultMaxListeners } from "node:events";
import { geminiAgent } from "./gemini.js";
import { groqAgent } from "./groq.js"

async function* generateResponse(model: string, query:string){
    switch (model){
        case "gemini": 
            for await (const chunk of geminiAgent(query)){
                yield chunk;
            }
            return; 
        case "groq":
            for await (const chunk of groqAgent(query)){
                yield chunk;
            }
            return;
        default: 
            for await (const chunk of geminiAgent(query)){
                yield chunk;
            }
            return ;
    }

}
export {generateResponse};