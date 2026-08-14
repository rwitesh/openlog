export function parseUris(json: string): string[] {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((uri) => typeof uri === "string")) {
    throw new Error("Invalid image URIs in database");
  }
  return parsed;
}
