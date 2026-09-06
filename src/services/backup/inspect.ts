import { File, FileMode } from "expo-file-system";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

import { concatChunks, parseArchiveManifest } from "./shared";
import { ARCHIVE_EXTENSION, type InspectBackupResult } from "./types";

/**
 * Inspects a backup archive without modifying disk or database.
 * Reads manifest.json only — db.json and media are not loaded into memory.
 */
export async function inspectBackupArchive(fileUri: string): Promise<InspectBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Selected backup file could not be found.");

  const buffers = { manifest: null as Uint8Array[] | null };
  let parseError: Error | null = null;

  const unzipper = new Unzip();
  unzipper.register(UnzipInflate);
  unzipper.register(UnzipPassThrough);

  unzipper.onfile = (file) => {
    if (file.name === "manifest.json") {
      const chunks: Uint8Array[] = [];
      buffers.manifest = chunks;
      file.ondata = (err, chunk) => {
        if (err) {
          parseError = err instanceof Error ? err : new Error(String(err));
          return;
        }
        chunks.push(chunk);
      };
      file.start();
    }
  };

  const CHUNK_SIZE = 256 * 1024;
  const readHandle = sourceFile.open(FileMode.ReadOnly);
  try {
    const fileSize = readHandle.size ?? 0;
    let bytesRead = 0;
    while (bytesRead < fileSize) {
      const chunk = readHandle.readBytes(Math.min(CHUNK_SIZE, fileSize - bytesRead));
      if (chunk.length === 0) break;
      bytesRead += chunk.length;
      unzipper.push(chunk, bytesRead >= fileSize);
    }
  } finally {
    readHandle.close();
  }

  if (parseError) throw parseError;

  if (!buffers.manifest?.length) {
    throw new Error(`Invalid file: Not a valid ${ARCHIVE_EXTENSION} archive (manifest missing).`);
  }

  const manifest = parseArchiveManifest(strFromU8(concatChunks(buffers.manifest)));

  return {
    format: manifest.format,
    version: manifest.version,
    createdAt: manifest.createdAt,
    appVersion: manifest.appVersion,
    counts: manifest.counts,
    previewEntries: manifest.previewEntries,
  };
}
