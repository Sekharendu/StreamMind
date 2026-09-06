import { splitIntoChunks } from "./chunker.js";
import { cleanUpRawString } from "./cleaner.js";
import { loadDocument } from "./loader.js";

async function execute(): Promise<void> {
    const source = "C:/Users/hp/Desktop/Q&A.txt";
    const document = await loadDocument(source);
    const raw = cleanUpRawString(document.rawContents);
    await splitIntoChunks(raw, source);
}

await execute();
