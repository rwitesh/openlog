import type { Entry, UpdateEntryInput } from "@/shared/types";

export interface CommitMediaUpdateDependencies {
  existing: Entry;
  input: UpdateEntryInput;
  update: () => Promise<Entry>;
  cleanup: (uris: string[]) => Promise<void>;
}

function removedUris(existing: Entry, input: UpdateEntryInput): string[] {
  const uris: string[] = [];

  if (input.images !== undefined) {
    const retained = new Set(input.images);
    uris.push(...existing.images.filter((uri) => !retained.has(uri)));
  }
  if (input.audios !== undefined) {
    const retained = new Set(input.audios);
    uris.push(...existing.audios.filter((uri) => !retained.has(uri)));
  }
  if (input.attachments !== undefined) {
    const retained = new Set(input.attachments.map((attachment) => attachment.uri));
    uris.push(
      ...existing.attachments
        .map((attachment) => attachment.uri)
        .filter((uri) => !retained.has(uri))
    );
  }

  return uris;
}

/** Persists an entry before scheduling cleanup for media it no longer references. */
export async function commitMediaUpdate({
  existing,
  input,
  update,
  cleanup,
}: CommitMediaUpdateDependencies): Promise<Entry> {
  const entry = await update();
  const uris = removedUris(existing, input);
  if (uris.length > 0) {
    void cleanup(uris);
  }
  return entry;
}
