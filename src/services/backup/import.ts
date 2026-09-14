import { File, FileMode } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

import { validateDatabaseSnapshot } from "@/services/db/database";

import { createRestoreStaging, discardRestoreStaging, queueRestore } from "./restoreTransaction";
import {
  assertArchiveManifest,
  BACKUP_LIMITS,
  extractMediaFilename,
  validateArchivePath,
} from "./shared";
import {
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  type ArchiveManifest,
  type ImportBackupOptions,
  type ImportBackupResult,
} from "./types";

function restoreId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/** Restores an opaque SQLite/media archive, retaining a durable marker across the media/database handoff. */
export async function importBackupArchive(
  fileUri: string,
  options?: ImportBackupOptions
): Promise<ImportBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Selected backup file does not exist.");
  const archiveBytes = sourceFile.info().size ?? 0;
  if (archiveBytes > BACKUP_LIMITS.archiveBytes)
    throw new Error("Backup file is too large to restore.");
  if (options?.signal?.aborted) throw new Error("Import cancelled");

  // Preflight device free storage: account for the archive, expanded staging (up to 2x archiveBytes),
  // retained previous rollback copies, and a 50 MiB safety buffer.
  const SAFETY_BUFFER_BYTES = 50 * 1024 * 1024;
  const estimatedStagingBytes = Math.min(
    Math.max(archiveBytes * 2, 10 * 1024 * 1024),
    BACKUP_LIMITS.uncompressedBytes
  );
  const requiredBytes = archiveBytes + estimatedStagingBytes + SAFETY_BUFFER_BYTES;

  let freeBytes: number | null = null;
  try {
    if (typeof FileSystem.getFreeDiskStorageAsync === "function") {
      freeBytes = await FileSystem.getFreeDiskStorageAsync();
    }
  } catch {
    // Storage check is unsupported on web or test environments.
  }
  if (typeof freeBytes === "number" && freeBytes > 0) {
    if (freeBytes < requiredBytes) {
      throw new Error(
        "Insufficient storage to restore backup. OpenLog requires free space for staging and rollback copies."
      );
    }
  }

  const id = restoreId();
  const staging = createRestoreStaging(id);
  const snapshotFile = staging.database;
  if (staging.media.exists) staging.media.delete();
  staging.media.create({ idempotent: true, intermediates: true });
  if (snapshotFile.exists) snapshotFile.delete();
  snapshotFile.create({ overwrite: true });
  const snapshotHandle = snapshotFile.open(FileMode.WriteOnly);
  let snapshotClosed = false;
  let manifest: ArchiveManifest | null = null;
  let queued = false;
  let failure: Error | null = null;
  let totalUncompressed = 0;
  let mediaCount = 0;
  const paths = new Set<string>();
  const mediaNames = new Set<string>();

  try {
    const unzipper = new Unzip();
    unzipper.register(UnzipInflate);
    unzipper.register(UnzipPassThrough);
    unzipper.onfile = (member) => {
      if (failure) return;
      if (options?.signal?.aborted) {
        failure = new Error("Import cancelled");
        return;
      }

      try {
        validateArchivePath(member.name);
      } catch (err) {
        failure = err instanceof Error ? err : new Error(String(err));
        return;
      }

      if (member.name === "manifest.json" && paths.has("manifest.json")) {
        failure = new Error("Invalid backup file: duplicate manifest.");
        return;
      }
      if (paths.has(member.name)) {
        failure = new Error("Invalid backup file: duplicate archive path.");
        return;
      }
      paths.add(member.name);
      if (member.originalSize !== undefined && member.originalSize > BACKUP_LIMITS.memberBytes) {
        failure = new Error("Invalid backup file: archive member is too large.");
        return;
      }

      let mediaHandle: ReturnType<File["open"]> | null = null;
      let memberBytes = 0;
      const metadataChunks: Uint8Array[] = [];
      try {
        if (member.name.startsWith("media/")) {
          const filename = extractMediaFilename(member.name);
          const filenameKey = filename.normalize("NFC").toLocaleLowerCase("en-US");
          if (mediaNames.has(filenameKey)) {
            throw new Error("Invalid backup file: duplicate media filename.");
          }
          mediaNames.add(filenameKey);
          mediaCount++;
          if (mediaCount > BACKUP_LIMITS.media)
            throw new Error("Invalid backup file: too many media files.");
          const destination = new File(staging.media, filename);
          destination.create({ overwrite: true });
          mediaHandle = destination.open(FileMode.WriteOnly);
        }
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error));
        return;
      }

      member.ondata = (error, chunk, final) => {
        if (error) {
          failure = error instanceof Error ? error : new Error(String(error));
          mediaHandle?.close();
          return;
        }
        if (options?.signal?.aborted) {
          failure = new Error("Import cancelled");
          mediaHandle?.close();
          return;
        }
        memberBytes += chunk.length;
        totalUncompressed += chunk.length;
        if (
          memberBytes > BACKUP_LIMITS.memberBytes ||
          totalUncompressed > BACKUP_LIMITS.uncompressedBytes
        ) {
          failure = new Error("Invalid backup file: archive expands beyond the restore limit.");
          mediaHandle?.close();
          return;
        }
        if (options?.signal?.aborted) {
          failure = new Error("Import cancelled");
          mediaHandle?.close();
          return;
        }
        try {
          if (member.name === "database.sqlite") snapshotHandle.writeBytes(chunk);
          else if (mediaHandle) mediaHandle.writeBytes(chunk);
          else {
            if (memberBytes > BACKUP_LIMITS.manifestBytes) {
              throw new Error("Invalid backup manifest: too large.");
            }
            metadataChunks.push(chunk);
          }
          if (final) {
            mediaHandle?.close();
            if (member.name === "manifest.json") {
              manifest = JSON.parse(strFromU8(concat(metadataChunks))) as ArchiveManifest;
              assertArchiveManifest(manifest, ARCHIVE_FORMAT, ARCHIVE_SCHEMA_VERSION);
            }
          }
        } catch (writeError) {
          failure = writeError instanceof Error ? writeError : new Error(String(writeError));
          mediaHandle?.close();
        }
      };
      member.start();
    };

    const input = sourceFile.open(FileMode.ReadOnly);
    try {
      const size = input.size ?? 0;
      let read = 0;
      while (read < size) {
        if (failure) throw failure;
        if (options?.signal?.aborted) throw new Error("Import cancelled");
        const chunk = input.readBytes(Math.min(256 * 1024, size - read));
        if (chunk.length === 0) break;
        read += chunk.length;
        options?.onProgress?.(read, size);
        unzipper.push(chunk, read === size);
      }
    } finally {
      input.close();
    }
    if (failure) throw failure;
    if (!manifest || !paths.has("database.sqlite")) {
      throw new Error("Invalid backup file: manifest or database missing.");
    }
    const validatedManifest = manifest as ArchiveManifest;
    if (mediaCount !== validatedManifest.counts.media) {
      throw new Error("Backup data does not match the manifest media count.");
    }

    snapshotHandle.close();
    snapshotClosed = true;
    const importedCount = await validateDatabaseSnapshot(snapshotFile, staging.media);
    if (importedCount !== validatedManifest.counts.entry) {
      throw new Error("Backup data does not match the manifest entry count.");
    }
    if (
      options?.counts &&
      (options.counts.entry !== importedCount || options.counts.media !== mediaCount)
    ) {
      throw new Error("Backup counts do not match the expected counts.");
    }
    if (options?.signal?.aborted) throw new Error("Import cancelled");

    await queueRestore(id, options?.counts ?? { entry: importedCount, media: mediaCount });
    queued = true;
    return { importedCount };
  } finally {
    if (!snapshotClosed) snapshotHandle.close();
    if (!queued) discardRestoreStaging(id);
  }
}
