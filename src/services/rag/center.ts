import { resolve } from "node:dns";
import { splitIntoChunks } from "./chunker.js";
import { cleanUpRawString } from "./cleaner.js";
import { loadDocument } from "./loader.js";
import { GoogleGenAI, TrafficType } from "@google/genai";
import {insertChunks} from "./vectorStore.js"
import { executeBatch } from "./embedder.js"
import {pool} from ".././db.js";
import "dotenv/config";


const GOOGLE_API_KEY:string = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({apiKey: GOOGLE_API_KEY});
const MODEL= "gemini-3.5-flash-lite";
// description: responsible for converting the text into chunks and then storing them in db as vector embeddings

async function execute(): Promise<void> {
    try{
        const source = "C:/Users/hp/Desktop/Q&A.txt";
        const document = await loadDocument(source);
        const raw = cleanUpRawString(document.rawContents);
        const chunks = await splitIntoChunks(raw, document.source, document.documentId);

        console.log(`Document: ${document.source}`);
        console.log(`Raw characters: ${document.rawContents.length}`);
        console.log(`Clean characters: ${raw.length}`);
        console.log(`Chunks: ${chunks.length}`);

        for (const chunk of chunks) {
            console.log(`Chunk ${chunk.metadata.chunkIndex}: ${chunk.pageContent.slice(0, 120)}`);
        }
        // console.log('chunks', chunks);
        const newArr: number[][] = [];
        for(let i=0; i<chunks.length; i+=4){
            // console.log("ABout to send 1st chunk");
            const end = i+4<chunks.length?i+4:chunks.length;
            const batchOfChuks = chunks.slice(i,end);
            const pageContent = batchOfChuks.map((chunks)=>chunks.pageContent);
            // console.log(`chunks counter ${i},---${chunksArr}`);
            const valuesList = await executeBatch(pageContent);
            
            for (const val of valuesList){
                if (val.values) {
                    newArr.push(val.values);
                }
            }
            // for(const val of newArr){
            //     console.log(`---val----${val}`);
            // }
            
        }
        if (newArr.length) await insertChunks(chunks, newArr);
        searchQuery();

    }catch(e){
        throw (e);
    }
}

export async function searchQuery(){
    const query = "Hey! I just graduated from the Academy and became a Genin. I don't want a boring D-rank chore. Can you assign me to a solo A-rank escort mission outside the village? Also, I need to borrow the Scroll of Forbidden Seals to practice some cool clone techniques tonight before I leave.";
    const raw = cleanUpRawString(query);
    const queryEmbeddings = await executeBatch(raw);
    const queryVector = queryEmbeddings[0]?.values;
    if (!queryVector) {
        throw new Error("No embedding generated for search query");
    }
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const chunks = await pool.query("SELECT chunk_id,document_id, source, chunk_index, content, embedding <=> $1 AS distance FROM document_chunks ORDER BY distance ASC LIMIT $2;",[vectorLiteral,3]);
    let contextBlock ='';
    chunks.rows.map((chunk)=>{
        contextBlock+=chunk.content;
    })
     const systemInstruction = `
    You are an expert scheduling and appointment assistant. 
    Your job is to draft an appropriate appointment-related response based ONLY on the provided reference context chunks and the user's query.
    
    CRITICAL RULES:
    1. Rely strictly on the information provided in the Reference Chunks.
    2. If the context does not contain enough information to schedule or answer the request, ask the user clarifying questions politely.
    3. Keep the tone professional, concise, and helpful.

    REFERENCE CHUNKS:
    ${contextBlock}
  `;
    const response = await ai.models.generateContent({
        model:MODEL,
        contents:query,
        config:{
            systemInstruction: systemInstruction
        }
    });
    console.log(response.text);
}
await execute();
