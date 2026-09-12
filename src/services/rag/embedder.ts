import "dotenv/config";
import {GoogleGenAI} from "@google/genai";
import {ai} from "../gemini.js";

type Embedding={
    values?: number[]
}

//returns vector 
export async function executeBatch(batchOfChuks: string[] | string): Promise<Embedding[]>{
    console.log("Chuks received", batchOfChuks);
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