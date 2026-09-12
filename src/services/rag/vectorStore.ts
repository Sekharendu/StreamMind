import type { ChunkType } from "../../types/type.js";
import {pool} from "../db.js"
export async function insertChunks(chunks: ChunkType[], vectors: number[][]){
    if(chunks.length != vectors.length){
        throw new Error("Mismatched chunks and vector data");
    }
    for(let i = 0; i< chunks.length; i++){
        console.log(`${i}.INside here`);
        const chunk = chunks[i];
        const vector = vectors[i];
        const vectorLiteral = `[${vector?.join(",")}]`;
        await pool.query("INSERT INTO document_chunks(chunk_id, document_id, source, chunk_index, content, embedding) VALUES($1,$2,$3,$4,$5,$6)",
            [chunk?.metadata.chunkId, chunk?.metadata.documentId, chunk?.metadata.source, chunk?.metadata.chunkIndex, chunk?.pageContent, vectorLiteral]);
    }
}

type RetrievedChuks = {
    chunk_content: string,
    distance : number
}


export async function searchSimilar(queryVector: number[], topK: number): Promise<RetrievedChuks[]>{
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const chunks = await pool.query("SELECT chunk_id,document_id, source, chunk_index, content, embedding <=> $1 AS distance FROM document_chunks ORDER BY distance ASC LIMIT $2;",[vectorLiteral,topK]);
    const retrievedChunks: RetrievedChuks[] =[];
    for(const row of chunks.rows){
        retrievedChunks.push(row.content, row.distance);
    }
    return retrievedChunks;
}

