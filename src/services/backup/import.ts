import { File, FileMode } from "expo-file-system";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

import { validateDatabaseSnapshot } from "@/services/db/database";

import { createRestoreStaging, discardRestoreStaging, queueRestore } from "./restoreTransaction";
import { assertArchiveManifest } from "./shared";
import {
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  type ArchiveManifest,
  type ImportBackupOptions,
  type ImportBackupResult,
} from "./types";

const LIMITS = {
  archiveBytes: 512 * 1024 * 1024,
  uncompressedBytes: 2 * 1024 * 1024 * 1024,
  memberBytes: 256 * 1024 * 1024,
  manifestBytes: 256 * 1024,
  media: 100_000,
} as const;

function restoreId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mediaFilename(path: string): string {
  if (!path.startsWith("media/") || path.length <= "media/".length) {
    throw new Error("Invalid media path in backup archive.");
  }
  const filename = path.slice("media/".length);
  if (filename.includes("/") || filename.includes("\\") || filename === "." || filename === "..") {
    throw new Error("Invalid media path in backup archive.");
  }
  return filename;
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
  if (archiveBytes > LIMITS.archiveBytes) throw new Error("Backup file is too large to restore.");
  if (options?.signal?.aborted) throw new Error("Import cancelled");

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
      if (paths.has(member.name)) {
        failure = new Error("Invalid backup file: duplicate archive path.");
        return;
      }
      paths.add(member.name);
      if (member.originalSize !== undefined && member.originalSize > LIMITS.memberBytes) {
        failure = new Error("Invalid backup file: archive member is too large.");
        return;
      }
      if (
        member.name !== "manifest.json" &&
        member.name !== "database.sqlite" &&
        !member.name.startsWith("media/")
      ) {
        failure = new Error("Invalid backup file: unexpected archive path.");
        return;
      }

      let mediaHandle: ReturnType<File["open"]> | null = null;
      let memberBytes = 0;
      const metadataChunks: Uint8Array[] = [];
      try {
        if (member.name.startsWith("media/")) {
          const filename = mediaFilename(member.name);
          const filenameKey = filename.normalize("NFC").toLocaleLowerCase("en-US");
          if (mediaNames.has(filenameKey)) {
            throw new Error("Invalid backup file: duplicate media filename.");
          }
          mediaNames.add(filenameKey);
          mediaCount++;
          if (mediaCount > LIMITS.media)
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
        memberBytes += chunk.length;
        totalUncompressed += chunk.length;
        if (memberBytes > LIMITS.memberBytes || totalUncompressed > LIMITS.uncompressedBytes) {
          failure = new Error("Invalid backup file: archive expands beyond the restore limit.");
          mediaHandle?.close();
          return;
        }
        try {
          if (member.name === "database.sqlite") snapshotHandle.writeBytes(chunk);
          else if (mediaHandle) mediaHandle.writeBytes(chunk);
          else {
            if (memberBytes > LIMITS.manifestBytes) {
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
    const importedCount = await validateDatabaseSnapshot(snapshotFile);
    if (importedCount !== validatedManifest.counts.entry) {
      throw new Error("Backup data does not match the manifest entry count.");
    }
    if (options?.signal?.aborted) throw new Error("Import cancelled");

    await queueRestore(id);
    queued = true;
    return { importedCount };
  } finally {
    if (!snapshotClosed) snapshotHandle.close();
    if (!queued) discardRestoreStaging(id);
  }
}
