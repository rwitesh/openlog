/**
 * Media URI parsing and filename extraction utilities.
 */
export function extractMediaFilenameFromUri(rawUri: string): string | null {
  if (!rawUri || typeof rawUri !== "string") return null;
  if (rawUri.startsWith("http://") || rawUri.startsWith("https://")) return null;
  let path = rawUri;
  if (path.startsWith("file://")) {
    path = path.slice("file://".length);
  }
  const cleanPath = path
    .replace(/^media\//, "")
    .split("?")[0]
    .split("#")[0];
  const parts = cleanPath.split("/");
  const filename = parts[parts.length - 1];
  if (!filename || filename === "." || filename === ".." || filename.includes("\\")) {
    return null;
  }
  return filename;
}
