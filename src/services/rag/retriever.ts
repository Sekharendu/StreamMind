
import { cleanUpRawString } from "./cleaner.js";
import {ai} from "../gemini.js"
import { searchSimilar} from "./vectorStore.js"
import { executeBatch } from "./embedder.js"
import "dotenv/config";
import { generateResponse } from "../llmProviders.js"

const MODEL= process.env.GEMINI_MODEL || "";

export async function *searchQuery(query:string){
    if(!MODEL){
        throw("ERROR: Incorrect MODEL Value ");
    }
    // const query = "Hey! I just graduated from the Academy and became a Genin. I don't want a boring D-rank chore. Can you assign me to a solo A-rank escort mission outside the village? Also, I need to borrow the Scroll of Forbidden Seals to practice some cool clone techniques tonight before I leave.";
    // const query = "I'm have a sharingan, what type of team leader will i be assigned under";
    const raw = cleanUpRawString(query);
    const queryEmbeddings = await executeBatch(raw);
    const queryVector = queryEmbeddings[0]?.values;
    if (!queryVector) {
        throw new Error("No embedding generated for search query");
    }
    // const vectorLiteral = `[${queryVector.join(",")}]`;
    // const chunks = await pool.query("SELECT chunk_id,document_id, source, chunk_index, content, embedding <=> $1 AS distance FROM document_chunks ORDER BY distance ASC LIMIT $2;",[vectorLiteral,3]);
    const chunks = await searchSimilar(queryVector, 3);
    // console.log("--here is the returned chunk---", chunks);

    let contextBlock ='';
    chunks.map((chunk)=>{
        contextBlock+=chunk.chunk_content;
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
  var gemResponseInChunks= "";
    for await (const chunk of generateResponse("gemini", query, systemInstruction)) {
        yield chunk;
    }
                   
}
// await searchQuery();