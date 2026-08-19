import {GoogleGenAI} from '@google/genai';
import type { RequestContext, Telemetry} from "../types/type.js"
import { getLocalStorage } from '../services/context.js';
import {info} from "./logger.js";

const GOOGLE_API_KEY:string = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({apiKey: GOOGLE_API_KEY});
const MODEL= "gemini-3.5-flash-lite";

async function* geminiAgent(query: string ):AsyncGenerator<string>{// used AsyncGenertor cause if i had used Promise then it would have waited for the response to complete, 
    // but asynGenerator lets send resposnse in a live-time stream.

    const {requestId, chatId, tenantId} = getLocalStorage();
    info("Gemini response started");
    const startTime = Date.now();
    if(!GOOGLE_API_KEY){
        throw("API key not configured");
    }
    const response = await ai.models.generateContentStream({
        model: MODEL,
        contents: query
    })
    for await(const chunk of response){
        const text = chunk.text;
        if(text){
            yield text;
        }
    }
    const endTime = Date.now();
    const latency = endTime - startTime;
    const telemetryData: Telemetry = {
        chatId: chatId,
        requestId: requestId,
        tenantId: tenantId,

        model: MODEL,

        latencyMs: latency,
        inputToken: 0,
        outputToken:0,

        cost:0
    }
    info("Gemini response ended");

    console.log('--Telemetry Data--',telemetryData);
}

export {geminiAgent};
