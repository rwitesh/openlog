import { File, FileMode } from "expo-file-system";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";
import { assertBackupManifest, BACKUP_LIMITS, validateArchivePath } from "../utils";
import {
  ARCHIVE_EXTENSION,
  type InspectBackupOptions,
  type InspectBackupResult,
  MANIFEST_FILENAME,
  TIMELINE_DATA_FILENAME,
} from "../utils/types";

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Inspects a backup archive without modifying disk or database.
 * Reads manifest.json only — entries and media files are not loaded into memory.
 * Applies conservative limits, path validation, and duplicate rejection.
 */
export async function inspectBackupArchive(
  fileUri: string,
  options?: InspectBackupOptions
): Promise<InspectBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Selected backup file could not be found.");

  const archiveBytes = sourceFile.info().size ?? 0;
  if (archiveBytes > BACKUP_LIMITS.archiveBytes) {
    throw new Error("Backup file is too large to import.");
  }
  if (options?.signal?.aborted) throw new Error("Inspection cancelled");

  const buffers = { manifestData: null as Uint8Array[] | null };
  let failure: Error | null = null;
  let manifestBytes = 0;
  let totalUncompressed = 0;
  let mediaCount = 0;
  const paths = new Set<string>();

  const unzipper = new Unzip();
  unzipper.register(UnzipInflate);
  unzipper.register(UnzipPassThrough);

  unzipper.onfile = (member) => {
    if (failure) return;
    if (options?.signal?.aborted) {
      failure = new Error("Inspection cancelled");
      return;
    }

    try {
      validateArchivePath(member.name, paths);
    } catch (err) {
      failure = err instanceof Error ? err : new Error(String(err));
      return;
    }
    paths.add(member.name);

    if (member.originalSize !== undefined) {
      if (member.originalSize > BACKUP_LIMITS.memberBytes) {
        failure = new Error("Invalid backup file: archive member is too large.");
        return;
      }
      totalUncompressed += member.originalSize;
      if (totalUncompressed > BACKUP_LIMITS.uncompressedBytes) {
        failure = new Error("Invalid backup file: archive expands beyond the import limit.");
        return;
      }
    }

    if (member.name.startsWith("media/")) {
      mediaCount++;
      if (mediaCount > BACKUP_LIMITS.media) {
        failure = new Error("Invalid backup file: too many media files.");
        return;
      }
    }

    if (member.name === MANIFEST_FILENAME) {
      const chunks: Uint8Array[] = [];
      buffers.manifestData = chunks;
      member.ondata = (err, chunk) => {
        if (err) {
          failure = err instanceof Error ? err : new Error(String(err));
          return;
        }
        if (options?.signal?.aborted) {
          failure = new Error("Inspection cancelled");
          return;
        }
        manifestBytes += chunk.length;
        if (member.originalSize === undefined) totalUncompressed += chunk.length;
        if (manifestBytes > BACKUP_LIMITS.manifestBytes) {
          failure = new Error("Invalid backup manifest: manifest data too large.");
          return;
        }
        if (totalUncompressed > BACKUP_LIMITS.uncompressedBytes) {
          failure = new Error("Invalid backup file: archive expands beyond the import limit.");
          return;
        }
        chunks.push(chunk);
      };
      member.start();
    }
  };

  const CHUNK_SIZE = 256 * 1024;
  const readHandle = sourceFile.open(FileMode.ReadOnly);
  try {
    const fileSize = readHandle.size ?? 0;
    let bytesRead = 0;
    while (bytesRead < fileSize) {
      if (failure) throw failure;
      if (options?.signal?.aborted) throw new Error("Inspection cancelled");
      const chunk = readHandle.readBytes(Math.min(CHUNK_SIZE, fileSize - bytesRead));
      if (chunk.length === 0) break;
      bytesRead += chunk.length;
      try {
        unzipper.push(chunk, bytesRead >= fileSize);
      } catch {
        throw new Error(`Invalid file: Not a valid ${ARCHIVE_EXTENSION} archive.`);
      }
    }
  } finally {
    readHandle.close();
  }

  if (failure) throw failure;
  if (options?.signal?.aborted) throw new Error("Inspection cancelled");

  if (!paths.has(MANIFEST_FILENAME) || !buffers.manifestData?.length) {
    throw new Error(
      `Invalid file: Not a valid ${ARCHIVE_EXTENSION} archive (${MANIFEST_FILENAME} missing).`
    );
  }
  if (!paths.has(TIMELINE_DATA_FILENAME)) {
    throw new Error(
      `Invalid file: Not a valid ${ARCHIVE_EXTENSION} archive (${TIMELINE_DATA_FILENAME} missing).`
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(strFromU8(concatChunks(buffers.manifestData)));
  } catch {
    throw new Error("Invalid backup manifest: malformed JSON.");
  }
  assertBackupManifest(data);

  return {
    format: data.format,
    version: data.version,
    createdAt: data.createdAt,
    appVersion: data.appVersion,
    counts: {
      entry: data.counts.entry,
      tag: data.counts.tag,
      media: data.counts.media,
    },
    uncompressedBytes: totalUncompressed,
    archiveBytes,
  };
}
