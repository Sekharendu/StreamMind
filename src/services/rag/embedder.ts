import "dotenv/config";
import {GoogleGenAI} from "@google/genai";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({apiKey: GOOGLE_API_KEY});

type Embedding={
    values?: number[]
}

//returns vector 
export async function executeBatch(batchOfChuks: string[] | string): Promise<Embedding[]>{
    console.log("Chuks received", batchOfChuks);
    if(!GOOGLE_API_KEY){
        throw("API key not configured correctly");
    }
    try{
        const response = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: batchOfChuks,
            config: { outputDimensionality: 768 },
        });
        console.log("----Embedding of gemini call is:----", response);
        const embeddingLength = response?.embeddings?.[0]?.values?.length;
        console.log(`Length of embedding: ${embeddingLength}`);
        if(!response.embeddings){
            throw new Error("no embeddings found");
        }
        return response.embeddings;
    }catch(error){
        throw new Error("Embedding generation failed", {
        cause: error
    });
    }
}