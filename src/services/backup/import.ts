import { Directory, File, FileMode, Paths } from "expo-file-system";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

import { notifyStoreReload } from "@/modules/entry";
import { importEntriesBatched } from "@/services/db/entries";
import { logDevWarning } from "@/shared/utils/devLog";

import { assertArchiveManifest, assertManifestMatchesEntries, concatChunks } from "./shared";
import type { ArchiveDb, ArchiveManifest, ImportBackupOptions, ImportBackupResult } from "./types";

function sanitizeMediaFilename(name: string): string {
  const base = name.replace(/^media\//, "");
  const sanitized = base.replace(/[/\\?%*:|"<>]/g, "_");
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Invalid media path in backup archive.");
  }
  return sanitized;
}

/**
 * Restores entries and attached media from an archive, replacing all current data.
 * Rolls back media and database changes when decompression or import fails.
 */
export async function importBackupArchive(
  fileUri: string,
  options?: ImportBackupOptions
): Promise<ImportBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Selected backup file does not exist.");
  if (options?.signal?.aborted) throw new Error("Import cancelled");

  const stagingDir = new Directory(Paths.cache, "restore_media_staging");
  if (stagingDir.exists) stagingDir.delete();
  stagingDir.create({ idempotent: true, intermediates: true });

  const backupStagingDir = new Directory(Paths.cache, "media_backup_staging");
  if (backupStagingDir.exists) backupStagingDir.delete();

  const dbTempFile = new File(Paths.cache, "restore_db_temp.json");
  if (dbTempFile.exists) dbTempFile.delete();
  dbTempFile.create({ overwrite: true });
  const dbHandle = dbTempFile.open(FileMode.WriteOnly);

  let fatalError: Error | null = null;
  let isRestored = false;
  const parsed = { manifest: null as ArchiveManifest | null };

  try {
    const unzipper = new Unzip();
    unzipper.register(UnzipInflate);
    unzipper.register(UnzipPassThrough);

    unzipper.onfile = (file) => {
      if (fatalError) return;

      if (file.name === "manifest.json") {
        const chunks: Uint8Array[] = [];
        file.ondata = (err, chunk, final) => {
          if (err) {
            fatalError = err instanceof Error ? err : new Error(String(err));
            return;
          }
          chunks.push(chunk);
          if (final) {
            try {
              parsed.manifest = JSON.parse(strFromU8(concatChunks(chunks))) as ArchiveManifest;
              assertArchiveManifest(parsed.manifest);
            } catch (parseErr) {
              fatalError = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
            }
          }
        };
        file.start();
      } else if (file.name === "db.json") {
        file.ondata = (err, chunk) => {
          if (err) {
            fatalError = err instanceof Error ? err : new Error(String(err));
            return;
          }
          try {
            dbHandle.writeBytes(chunk);
          } catch (writeErr) {
            fatalError = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
          }
        };
        file.start();
      } else if (file.name.startsWith("media/") && !file.name.endsWith("/")) {
        try {
          const filename = sanitizeMediaFilename(file.name);
          const destFile = new File(stagingDir, filename);
          destFile.create({ overwrite: true });
          const handle = destFile.open(FileMode.WriteOnly);

          file.ondata = (err, chunk, final) => {
            if (err) {
              handle.close();
              fatalError = err instanceof Error ? err : new Error(String(err));
              return;
            }
            try {
              handle.writeBytes(chunk);
              if (final) {
                handle.close();
              }
            } catch (writeErr) {
              handle.close();
              fatalError = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
            }
          };
          file.start();
        } catch (err) {
          fatalError = err instanceof Error ? err : new Error(String(err));
        }
      }
    };

    const CHUNK_SIZE = 256 * 1024;
    const readHandle = sourceFile.open(FileMode.ReadOnly);
    try {
      const fileSize = readHandle.size ?? 0;
      let bytesRead = 0;
      while (bytesRead < fileSize) {
        if (fatalError) throw fatalError;
        if (options?.signal?.aborted) throw new Error("Import cancelled");
        const chunk = readHandle.readBytes(Math.min(CHUNK_SIZE, fileSize - bytesRead));
        if (chunk.length === 0) break;
        bytesRead += chunk.length;
        options?.onProgress?.(bytesRead, fileSize);
        unzipper.push(chunk, bytesRead >= fileSize);
      }
    } finally {
      readHandle.close();
    }

    if (fatalError) throw fatalError;
    if (options?.signal?.aborted) throw new Error("Import cancelled");

    if (!parsed.manifest) {
      throw new Error("Invalid backup file: manifest is missing or invalid.");
    }
  } finally {
    dbHandle.close();
  }

  let dbData: ArchiveDb;
  try {
    dbData = JSON.parse(await dbTempFile.text()) as ArchiveDb;
  } catch {
    throw new Error("Invalid backup file: unable to parse entries.");
  }

  if (!Array.isArray(dbData?.entries)) {
    throw new Error("Invalid backup file: entries list is missing.");
  }

  assertManifestMatchesEntries(parsed.manifest, dbData.entries);

  if (options?.signal?.aborted) throw new Error("Import cancelled");

  const mediaDir = new Directory(Paths.document, "media");
  let movedExisting = false;

  try {
    if (mediaDir.exists) {
      await mediaDir.move(backupStagingDir);
      movedExisting = true;
    }
    if (stagingDir.exists) {
      await stagingDir.move(mediaDir);
    }
    if (!mediaDir.exists) {
      mediaDir.create({ idempotent: true, intermediates: true });
    }

    const importedCount = await importEntriesBatched(dbData.entries, { signal: options?.signal });

    if (backupStagingDir.exists) {
      try {
        backupStagingDir.delete();
      } catch {
        // ignore
      }
    }

    isRestored = true;
    notifyStoreReload();

    return { importedCount };
  } catch (err) {
    try {
      if (mediaDir.exists) mediaDir.delete();
      if (movedExisting && backupStagingDir.exists) await backupStagingDir.move(mediaDir);
      if (!mediaDir.exists) mediaDir.create({ idempotent: true, intermediates: true });
    } catch (rollbackErr) {
      logDevWarning("importBackupArchive:rollback", rollbackErr);
    }
    throw err;
  } finally {
    try {
      if (dbTempFile.exists) dbTempFile.delete();
      if (!isRestored && stagingDir.exists) stagingDir.delete();
    } catch {
      // ignore
    }
  }
}
