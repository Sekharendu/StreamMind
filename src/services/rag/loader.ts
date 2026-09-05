import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { splitIntoChunks } from "./chunker.js";
import {cleanUpRawString} from "./cleaner.js"
import { randomUUID } from "node:crypto";

export async function loadDocument(documentPath: string): Promise<Record<string, string>>{
    const extName = extname(documentPath);
    if(extName === ".txt" || extName === ".md"){
        try{
            const documentId = randomUUID();
            const rawContents = await readFile(documentPath,"utf-8");
            return {documentId, rawContents};
            // const cleanUpContent = cleanUpRawString(rawContents);
            // splitIntoChunks(cleanUpContent);
        }catch(e){

        }
    }else throw Error;
    return {"",""};
}