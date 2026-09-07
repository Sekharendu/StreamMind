import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

type LoadedDocument = {
    documentId: string;
    source: string;
    rawContents: string;
}

export async function loadDocument(documentPath: string): Promise<LoadedDocument>{
    const extension = extname(documentPath).toLowerCase();

    if (extension !== ".txt" && extension !== ".md") {
        throw new Error(`Unsupported document type: ${extension || "none"}`);
    }

    try {
        const rawContents = await readFile(documentPath, "utf-8");

        return {
            documentId: randomUUID(),
            source: documentPath,
            rawContents,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load document "${documentPath}": ${message}`);
    }
}
