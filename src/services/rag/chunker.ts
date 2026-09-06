import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { randomUUID } from "node:crypto";
import type { ChunkType } from "../../types/type.js"

// const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 0 })
// const texts = splitter.splitText(document)

export async function splitIntoChunks(rawContents: string, source: string): Promise<ChunkType[]>{
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 100,
        chunkOverlap:20,
        separators: [
            "\n\n",
            "\n",
            ".",
            ""]
    });
    const chunksList = await splitter.splitText(rawContents);
    const newChunks = makeDocs(chunksList, source);  
    console.log(newChunks);
    return newChunks;
}

export function makeDocs(chunksList:string[], source: string):ChunkType[]{
    chunksList.map((chunks, index)=>{
        return {
            pageContent: chunks,
            metadata: {
                chunkId: randomUUID(),
                chunkIndex: index,
                source: source
            }
        }
    });
}