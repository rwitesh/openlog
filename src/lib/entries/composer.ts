import type { NewEntryInput } from "@/types/entry";
import { persistMedia } from "@/lib/storage";

export interface ComposerResult {
  text?: string;
  imageUris?: string[];
  audioUri?: string;
  durationMs?: number;
  createdAt?: number;
}

export function canSaveComposer(result: ComposerResult): boolean {
  return Boolean(
    result.text?.trim() || result.imageUris?.length || result.audioUri
  );
}

/** Turn composer output into a database entry input, persisting media when needed. */
export async function fromComposer(result: ComposerResult): Promise<NewEntryInput | null> {
  const text = result.text?.trim() || undefined;
  const createdAt = result.createdAt;

  if (result.audioUri) {
    const uri = await persistMedia(result.audioUri, "m4a");
    return { type: "audio", text, uri, durationMs: result.durationMs, createdAt };
  }

  if (result.imageUris?.length) {
    const uris = await Promise.all(
      result.imageUris.map((imageUri) => persistMedia(imageUri, "jpg"))
    );
    return { type: "image", text, uris, createdAt };
  }

  if (text) {
    return { type: "text", text, createdAt };
  }

  return null;
}
