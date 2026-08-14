import type { NewEntryInput } from "@/db/entries";
import { persistMedia } from "@/lib/storage";

export interface ComposerResult {
  text?: string;
  imageUri?: string;
  audioUri?: string;
  durationMs?: number;
}

export function canSaveComposer(result: ComposerResult): boolean {
  return Boolean(result.text?.trim() || result.imageUri || result.audioUri);
}

/** Turn composer output into a database entry input, persisting media when needed. */
export async function fromComposer(result: ComposerResult): Promise<NewEntryInput | null> {
  const text = result.text?.trim() || undefined;

  if (result.audioUri) {
    const uri = await persistMedia(result.audioUri, "m4a");
    return { type: "audio", text, uri, durationMs: result.durationMs };
  }

  if (result.imageUri) {
    const uri = await persistMedia(result.imageUri, "jpg");
    return { type: "image", text, uri };
  }

  if (text) {
    return { type: "text", text };
  }

  return null;
}
