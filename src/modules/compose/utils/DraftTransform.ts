import { persistAttachment, persistMedia } from "@/services/media";
import type { NewEntryInput } from "@/shared/types";
import type { Draft } from "../types";

export function canSaveDraft(draft: Draft): boolean {
  return Boolean(
    draft.text?.trim() || draft.images?.length || draft.audios?.length || draft.attachments?.length
  );
}

/** Turn write-screen draft into a database entry, persisting media when needed. */
export async function fromDraft(draft: Draft): Promise<NewEntryInput | null> {
  const text = draft.text?.trim() || undefined;
  const createdAt = draft.createdAt;
  const location = draft.location;

  const images = draft.images?.length
    ? await Promise.all(draft.images.map((imageUri) => persistMedia(imageUri, "jpg")))
    : [];

  const audios = draft.audios?.length
    ? await Promise.all(draft.audios.map((audioUri) => persistMedia(audioUri, "m4a")))
    : [];

  // Attachments are persisted when saving, keeping drafts ephemeral.
  const attachments = draft.attachments?.length
    ? await Promise.all(draft.attachments.map(persistAttachment))
    : [];

  if (text || images.length || audios.length || attachments.length) {
    return {
      text,
      images,
      audios,
      attachments,
      tagIds: draft.tags?.map((tag) => tag.id),
      createdAt,
      location,
    };
  }

  return null;
}
