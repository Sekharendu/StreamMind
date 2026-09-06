export function cleanUpRawString(raw: string): string {
  return raw
    .replaceAll("\r\n", "\n")  // windows -> unix
    .replaceAll("\r", "\n")    // old mac -> unix
    .split("\n")
    .map(line => line.trimEnd()) // keep indent? trim trailing only
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // 3+ blank lines -> 1 blank line
    .replace(/[ \t]{2,}/g, " ") // huge inline gaps -> single space
    .trim();
}