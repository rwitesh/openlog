import { Directory, File, Paths } from "expo-file-system";

import { waitForExportGate } from "@/services/backup/utils";
import { logDevWarning } from "@/shared/utils/devLog";

/** The app's single durable media directory; the database stores bare filenames relative to it. */
export function mediaDirectory(): Directory {
  return new Directory(Paths.document, "media");
}

/** Resolves a stored media filename (e.g. "uuid.jpg") to its live file URI for display and playback. */
export function mediaFileUri(filename: string): string {
  return new File(mediaDirectory(), filename).uri;
}

/** Generates a collision-free filename for durable media storage. */
function createMediaFilename(ext: string): string {
  const cleanExt = ext.replace(/^\./, "").toLowerCase() || "bin";
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${uuid}.${cleanExt}`;
}

/**
 * Copies a picked or recorded file into the durable media directory and returns
 * its stored filename. Cache and picker URIs are ephemeral, so only durable
 * copies may be referenced by an entry. A source already inside the media
 * directory passes through unchanged — re-editing an entry must not duplicate
 * its files.
 */
export async function persistMedia(sourceUri: string, ext: string): Promise<string> {
  const dir = mediaDirectory();
  dir.create({ idempotent: true, intermediates: true });

  const dirPrefix = dir.uri.endsWith("/") ? dir.uri : `${dir.uri}/`;
  if (sourceUri.startsWith(dirPrefix)) {
    return sourceUri.slice(dirPrefix.length);
  }

  const filename = createMediaFilename(ext);
  await new File(sourceUri).copy(new File(dir, filename));
  return filename;
}

/** Deletes stored media files by filename. Missing files are ignored. */
export async function deleteMediaFiles(filenames: string[]): Promise<void> {
  if (!filenames.length) return;
  await waitForExportGate();

  const dir = mediaDirectory();
  await Promise.all(
    filenames.map(async (filename) => {
      try {
        const file = new File(dir, filename);
        if (file.exists) file.delete();
      } catch (error) {
        logDevWarning("media:deleteMediaFiles", error);
      }
    })
  );
}
