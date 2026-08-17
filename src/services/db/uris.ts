export function parseUris(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((uri): uri is string => typeof uri === "string");
    }
    return [];
  } catch {
    return [];
  }
}
