import type { Attachment } from "@/shared/types";

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

/** Parses a stored `attachments` column, tolerating malformed rows from older or corrupted data. */
export function parseAttachments(json: string | null | undefined): Attachment[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        uri: typeof item.uri === "string" ? item.uri : "",
        name: typeof item.name === "string" && item.name ? item.name : "File",
        mime: typeof item.mime === "string" ? item.mime : undefined,
        size: typeof item.size === "number" ? item.size : undefined,
      }))
      .filter((attachment) => attachment.uri.length > 0);
  } catch {
    return [];
  }
}
