import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 0 })
// const texts = splitter.splitText(document)

export function splitIntoChunks(rawContents: string): Promise<string[]>{
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 100,
        chunkOverlap:20,
        separators: [
            "\n\n",
            "\n",
            ".",
            ""]
    });
    return splitter.splitText(rawContents);
}