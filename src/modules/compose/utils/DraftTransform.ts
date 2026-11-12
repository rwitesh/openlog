import { type DraftSnapshot, draftSignature } from "@/services/drafts/snapshot";
import { fileExtension, persistAttachment, persistMedia } from "@/services/media";
import type { Entry, NewEntryInput } from "@/shared/types";
import type { Draft } from "../types";

export function canSaveDraft(draft: Draft): boolean {
  return Boolean(
    draft.text?.trim() || draft.images?.length || draft.audios?.length || draft.attachments?.length
  );
}

/** The entry's stored content in draft form. */
export function entrySnapshot(entry: Entry): DraftSnapshot {
  return {
    text: entry.text ?? "",
    images: entry.images,
    audios: entry.audios,
    attachments: entry.attachments,
    tags: entry.tags,
    createdAt: entry.createdAt,
    location: entry.location ?? null,
  };
}

/** A draft is worth keeping when it would save something: new content, or a change to the entry. */
export function isDraftWorthKeeping({
  draft,
  entry,
}: {
  draft: DraftSnapshot;
  entry: Entry | undefined;
}): boolean {
  return entry
    ? draftSignature(draft) !== draftSignature(entrySnapshot(entry))
    : canSaveDraft(draft);
}

/**
 * Photos within the size limit keep their original encoding; only downscaled ones are JPEG.
 * Draft copies of a file with no usable extension are named `.bin`, so that also means JPEG.
 */
function photoExtension(uri: string): string {
  const ext = fileExtension(uri.split(/[?#]/)[0]);
  return ext === "bin" ? "jpg" : ext;
}

/** Turn write-screen draft into a database entry, persisting media when needed. */
export async function fromDraft(draft: Draft): Promise<NewEntryInput | null> {
  const text = draft.text?.trim() || null;
  const createdAt = draft.createdAt;
  const location = draft.location;

  const images = draft.images?.length
    ? await Promise.all(
        draft.images.map((imageUri) => persistMedia(imageUri, photoExtension(imageUri)))
      )
    : [];

  const audios = draft.audios?.length
    ? await Promise.all(draft.audios.map((audioUri) => persistMedia(audioUri, "m4a")))
    : [];

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
