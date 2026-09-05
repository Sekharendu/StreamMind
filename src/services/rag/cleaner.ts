export function cleanUpRawString(rawContents: string): string {
    const trimmedText = rawContents.trim();
    return trimmedText.replaceAll("\r\n","\n");
}