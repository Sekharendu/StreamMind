import { resolve } from "node:dns";
import { splitIntoChunks } from "./chunker.js";
import { cleanUpRawString } from "./cleaner.js";
import { loadDocument } from "./loader.js";
import { GoogleGenAI, TrafficType } from "@google/genai";
import {insertChunks, searchSimilar} from "./vectorStore.js"
import { executeBatch } from "./embedder.js"
import {pool} from ".././db.js";
import "dotenv/config";


const GOOGLE_API_KEY:string = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({apiKey: GOOGLE_API_KEY});
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
        

    }catch(e){
        throw (e);
    }
}
await execute();
