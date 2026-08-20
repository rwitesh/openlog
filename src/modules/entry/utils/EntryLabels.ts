import type { Entry } from "@/shared/types";

export function entryContentTypeLabel(entry: Entry): string {
  const parts: string[] = [];
  if (entry.text?.trim()) parts.push("Text");
  if (entry.images?.length)
    parts.push(entry.images.length === 1 ? "1 Photo" : `${entry.images.length} Photos`);
  if (entry.audios?.length)
    parts.push(entry.audios.length === 1 ? "1 Voice note" : `${entry.audios.length} Voice notes`);
  return parts.length ? parts.join(" · ") : "Note";
}
