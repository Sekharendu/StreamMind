import {GoogleGenAI} from '@google/genai';
import type { RequestContext} from "../types/type.js"
import { getLocalStorage } from '../services/context.js';
const GOOGLE_API_KEY:string = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({apiKey: GOOGLE_API_KEY});

async function* geminiAgent(query: string ):AsyncGenerator<string>{// used AsyncGenertor cause if i had used Promise then it would have waited for the response to complete, 
    // but asynGenerator lets send resposnse in a live-time stream.
    const {requestId, chatId, tenantId} = getLocalStorage();
    if(!GOOGLE_API_KEY){
        throw("API key not configured");
    }
    const response = await ai.models.generateContentStream({
        model: "gemini-3.5-flash-lite",
        contents: query
    })
    for await(const chunk of response){
        const text = chunk.text;
        if(text){
            yield text;
        }
    }
}

export {geminiAgent};
