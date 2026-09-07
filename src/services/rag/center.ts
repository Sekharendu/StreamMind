import { splitIntoChunks } from "./chunker.js";
import { cleanUpRawString } from "./cleaner.js";
import { loadDocument } from "./loader.js";

async function execute(): Promise<void> {
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
}

await execute();
