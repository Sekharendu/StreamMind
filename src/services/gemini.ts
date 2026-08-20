import {GoogleGenAI} from '@google/genai';
import type { RequestContext, Telemetry} from "../types/type.js"
import { getLocalStorage } from '../services/context.js';
import {info} from "./logger.js";

const GOOGLE_API_KEY:string = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({apiKey: GOOGLE_API_KEY});
const MODEL= "gemini-3.5-flash-lite";
let totalTokenCount:number =0 ;
let outputTokenCount:number = 0;
let inputTokenCount:number = 0;
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
    // console.log('---gem response---', response);
    for await(const chunk of response){
        // info('----gemini response----');
        console.log('--gemini response---',chunk);
        if(inputTokenCount==0) inputTokenCount = chunk.usageMetadata?.promptTokenCount || 0;
        totalTokenCount += chunk.usageMetadata?.totalTokenCount || 0;
        outputTokenCount += chunk.usageMetadata?.candidatesTokenCount || 0;

        // chunk.usageMetadata?.promptTokenCount
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
        
        provider: "google",
        model: MODEL,

        latencyMs: latency,
        inputToken: inputTokenCount,
        outputToken: outputTokenCount,
        totalToken: totalTokenCount,

        cost:0
    }
    info("Gemini response ended");

    console.log('--Telemetry Data--',telemetryData);
}

export {geminiAgent};
