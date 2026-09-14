import { File, FileMode } from "expo-file-system";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

import { assertArchiveManifest, BACKUP_LIMITS, validateArchivePath } from "./shared";
import {
  ARCHIVE_EXTENSION,
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  type ArchiveManifest,
  type InspectBackupOptions,
  type InspectBackupResult,
} from "./types";

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
 * Reads manifest.json only — the database and media are not loaded into memory.
 * Applies the same conservative limits, path validation, and duplicate rejection as restore.
 */
export async function inspectBackupArchive(
  fileUri: string,
  options?: InspectBackupOptions
): Promise<InspectBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Selected backup file could not be found.");

  const archiveBytes = sourceFile.info().size ?? 0;
  if (archiveBytes > BACKUP_LIMITS.archiveBytes) {
    throw new Error("Backup file is too large to restore.");
  }
  if (options?.signal?.aborted) throw new Error("Inspection cancelled");

  const buffers = { manifest: null as Uint8Array[] | null };
  let failure: Error | null = null;
  let manifestSeen = false;
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
      validateArchivePath(member.name);
    } catch (err) {
      failure = err instanceof Error ? err : new Error(String(err));
      return;
    }

    if (member.name === "manifest.json" && manifestSeen) {
      failure = new Error("Invalid backup file: duplicate manifest.");
      return;
    }
    if (paths.has(member.name)) {
      failure = new Error("Invalid backup file: duplicate archive path.");
      return;
    }
    paths.add(member.name);

    if (member.name === "manifest.json") {
      manifestSeen = true;
    }

    if (member.originalSize !== undefined) {
      if (member.originalSize > BACKUP_LIMITS.memberBytes) {
        failure = new Error("Invalid backup file: archive member is too large.");
        return;
      }
      totalUncompressed += member.originalSize;
      if (totalUncompressed > BACKUP_LIMITS.uncompressedBytes) {
        failure = new Error("Invalid backup file: archive expands beyond the restore limit.");
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

    if (member.name === "manifest.json") {
      const chunks: Uint8Array[] = [];
      buffers.manifest = chunks;
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
        totalUncompressed += chunk.length;
        if (manifestBytes > BACKUP_LIMITS.manifestBytes) {
          failure = new Error("Invalid backup manifest: too large.");
          return;
        }
        if (totalUncompressed > BACKUP_LIMITS.uncompressedBytes) {
          failure = new Error("Invalid backup file: archive expands beyond the restore limit.");
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

  if (!manifestSeen || !buffers.manifest?.length) {
    throw new Error(`Invalid file: Not a valid ${ARCHIVE_EXTENSION} archive (manifest missing).`);
  }

  let manifest: ArchiveManifest;
  try {
    manifest = JSON.parse(strFromU8(concatChunks(buffers.manifest))) as ArchiveManifest;
  } catch {
    throw new Error("Invalid backup manifest: malformed JSON.");
  }
  assertArchiveManifest(manifest, ARCHIVE_FORMAT, ARCHIVE_SCHEMA_VERSION);

  return {
    format: manifest.format,
    version: manifest.version,
    createdAt: manifest.createdAt,
    appVersion: manifest.appVersion,
    counts: manifest.counts,
    uncompressedBytes: totalUncompressed,
    archiveBytes,
  };
}
