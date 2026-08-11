import {GoogleGenAI} from '@google/genai';
import type { FastifyRequest, FastifyReply } from 'fastify';
type ReqType = {
  Body: {
    query: string;
  };
};
const GOOGLE_API_KEY:string = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({apiKey: GOOGLE_API_KEY});

async function geminiAgent(req: FastifyRequest<ReqType>, res: FastifyReply){
    res.header("Content-Type", "text/plain; charset=utf-8");
    res.header("Transfer-Encoding", "chunked");
    let response_text = '';
    const response = await ai.models.generateContentStream({
        model: "gemini-3.5-flash-lite",
        contents: req.body.query
    })
    for await(const chunk of response){
        const text = chunk.text;
        if(text){
            console.log("CHUNK:", text);
            res.raw.write(text);
        }
    }
    res.raw.end();
}

export {geminiAgent};
