import type { Entry, UpdateEntryInput } from "@/shared/types";
import { extractMediaFilenameFromUri } from "../../../services/db/validation.ts";

/** Comparison key for a media reference: the stored filename, independent of container path. */
function mediaKey(uri: string): string {
  return extractMediaFilenameFromUri(uri) ?? uri.trim();
}

/**
 * Filenames an update stopped referencing, computed against pure filenames so a
 * container path change can never register as a removal. Fields the input
 * leaves undefined keep their media.
 */
export function removedMedia(existing: Entry, input: UpdateEntryInput): string[] {
  const removed: string[] = [];

  const drop = (before: string[], after: string[] | undefined) => {
    if (after === undefined) return;
    const retained = new Set(after.map(mediaKey));
    removed.push(...before.map(mediaKey).filter((key) => !retained.has(key)));
  };

  drop(existing.images, input.images);
  drop(existing.audios, input.audios);
  drop(
    existing.attachments.map((attachment) => attachment.uri),
    input.attachments?.map((attachment) => attachment.uri)
  );

  return removed;
}
