import type { NewEntryInput } from "@/shared/types";
import { persistMedia } from "@/services/media/storage";
import type { Draft } from "../types";

export function canSaveDraft(draft: Draft): boolean {
  return Boolean(draft.text?.trim() || draft.imageUris?.length || draft.audioUri);
}

/** Turn write-screen draft into a database entry, persisting media when needed. */
export async function fromDraft(draft: Draft): Promise<NewEntryInput | null> {
  const text = draft.text?.trim() || undefined;
  const createdAt = draft.createdAt;
  const location = draft.location;

  if (draft.audioUri) {
    const uri = await persistMedia(draft.audioUri, "m4a");
    return { type: "audio", text, uri, durationMs: draft.durationMs, createdAt, location };
  }

  if (draft.imageUris?.length) {
    const uris = await Promise.all(
      draft.imageUris.map((imageUri) => persistMedia(imageUri, "jpg"))
    );
    return { type: "image", text, uris, createdAt, location };
  }

  if (text) {
    return { type: "text", text, createdAt, location };
  }

  return null;
}
