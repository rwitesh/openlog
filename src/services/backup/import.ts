import { Directory, File, FileMode, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { defaultDatabaseDirectory } from "expo-sqlite";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

import { notifyStoreReload } from "@/modules/entry/store/EntryStore";
import { runDb } from "@/services/db/database";
import { mediaDirectory } from "@/services/media/storage";
import {
  type ImportBackupOptions,
  type ImportBackupResult,
  MANIFEST_FILENAME,
  TIMELINE_DATA_FILENAME,
} from "./types";
import {
  assertBackupManifest,
  assertBackupTimelineData,
  BACKUP_LIMITS,
  calculateRequiredRestoreBytes,
  extractMediaFilename,
  validateArchivePath,
} from "./utils";

function getExistingTimelineDiskBytes(): number {
  let bytes = 0;
  try {
    if (defaultDatabaseDirectory) {
      const dbDirUri = defaultDatabaseDirectory.startsWith("file://")
        ? defaultDatabaseDirectory
        : `file://${defaultDatabaseDirectory}`;
      for (const suffix of ["", "-wal", "-shm"] as const) {
        const file = new File(dbDirUri, `app.db${suffix}`);
        if (file.exists) bytes += file.info().size ?? 0;
      }
    }
  } catch {
    // ignore
  }
  try {
    const mediaDir = mediaDirectory();
    if (mediaDir.exists) {
      for (const item of mediaDir.list()) {
        if (item instanceof File && item.exists) {
          bytes += item.info().size ?? 0;
        }
      }
    }
  } catch {
    // ignore
  }
  return bytes;
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

/**
 * Restores a structured JSON backup archive in-session with ACID transactional safety.
 */
export async function importBackupArchive(
  fileUri: string,
  options?: ImportBackupOptions
): Promise<ImportBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Selected backup file does not exist.");
  const archiveBytes = sourceFile.info().size ?? 0;
  if (archiveBytes > BACKUP_LIMITS.archiveBytes) {
    throw new Error("Backup file is too large to restore.");
  }
  if (options?.signal?.aborted) throw new Error("Import cancelled");
  if (
    options?.expectedArchiveBytes !== undefined &&
    options.expectedArchiveBytes !== archiveBytes
  ) {
    throw new Error(
      "The selected backup file was modified after inspection. Please select the file again."
    );
  }

  const existingTimelineBytes = getExistingTimelineDiskBytes();
  const requiredBytes = calculateRequiredRestoreBytes({
    archiveBytes,
    existingTimelineBytes,
    uncompressedBytes: options?.uncompressedBytes,
    expectedArchiveBytes: options?.expectedArchiveBytes,
  });

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
        "Insufficient storage to restore backup. OpenLog requires free space for staging."
      );
    }
  }

  const stagingDir = new Directory(
    Paths.cache,
    `openlog-restore-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  stagingDir.create({ idempotent: true, intermediates: true });
  const stagingMediaDir = new Directory(stagingDir, "media");
  stagingMediaDir.create({ idempotent: true, intermediates: true });

  const manifestChunks: Uint8Array[] = [];
  const timelineChunks: Uint8Array[] = [];
  let failure: Error | null = null;
  let totalUncompressed = 0;
  let manifestBytes = 0;
  let timelineBytes = 0;
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
        validateArchivePath(member.name, paths);
      } catch (err) {
        failure = err instanceof Error ? err : new Error(String(err));
        return;
      }

      paths.add(member.name);
      if (member.originalSize !== undefined && member.originalSize > BACKUP_LIMITS.memberBytes) {
        failure = new Error("Invalid backup file: archive member is too large.");
        return;
      }

      let mediaHandle: ReturnType<File["open"]> | null = null;
      let memberBytes = 0;

      try {
        if (member.name.startsWith("media/")) {
          const filename = extractMediaFilename(member.name);
          const filenameKey = filename.normalize("NFC").toLocaleLowerCase("en-US");
          if (mediaNames.has(filenameKey)) {
            throw new Error("Invalid backup file: duplicate media filename.");
          }
          mediaNames.add(filenameKey);
          mediaCount++;
          if (mediaCount > BACKUP_LIMITS.media) {
            throw new Error("Invalid backup file: too many media files.");
          }
          const destination = new File(stagingMediaDir, filename);
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

        try {
          if (member.name === MANIFEST_FILENAME) {
            manifestBytes += chunk.length;
            if (manifestBytes > BACKUP_LIMITS.manifestBytes) {
              throw new Error("Invalid backup manifest: manifest data too large.");
            }
            manifestChunks.push(chunk);
          } else if (member.name === TIMELINE_DATA_FILENAME) {
            timelineBytes += chunk.length;
            if (timelineBytes > BACKUP_LIMITS.timelineDataBytes) {
              throw new Error("Invalid backup data: timeline data too large.");
            }
            timelineChunks.push(chunk);
          } else if (mediaHandle) {
            mediaHandle.writeBytes(chunk);
          }
          if (final) {
            mediaHandle?.close();
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
    if (!paths.has(MANIFEST_FILENAME) || manifestChunks.length === 0) {
      throw new Error(`Invalid backup file: ${MANIFEST_FILENAME} missing.`);
    }
    if (!paths.has(TIMELINE_DATA_FILENAME) || timelineChunks.length === 0) {
      throw new Error(`Invalid backup file: ${TIMELINE_DATA_FILENAME} missing.`);
    }

    let rawManifest: unknown;
    try {
      rawManifest = JSON.parse(strFromU8(concat(manifestChunks)));
    } catch {
      throw new Error("Invalid backup manifest: malformed JSON.");
    }
    assertBackupManifest(rawManifest);

    let rawTimeline: unknown;
    try {
      rawTimeline = JSON.parse(strFromU8(concat(timelineChunks)));
    } catch {
      throw new Error("Invalid backup data: malformed JSON.");
    }
    assertBackupTimelineData(rawTimeline);

    if (rawTimeline.entries.length !== rawManifest.counts.entry) {
      throw new Error(
        `Backup entry count mismatch (${rawTimeline.entries.length} entries, manifest specifies ${rawManifest.counts.entry}).`
      );
    }
    if (rawTimeline.tags.length !== rawManifest.counts.tag) {
      throw new Error(
        `Backup tag count mismatch (${rawTimeline.tags.length} tags, manifest specifies ${rawManifest.counts.tag}).`
      );
    }
    if (mediaCount !== rawManifest.counts.media) {
      throw new Error(
        `Backup media count mismatch (${mediaCount} media files, manifest specifies ${rawManifest.counts.media}).`
      );
    }
    if (options?.counts) {
      if (
        options.counts.entry !== rawManifest.counts.entry ||
        options.counts.media !== rawManifest.counts.media
      ) {
        throw new Error("Backup counts do not match the expected counts.");
      }
    }
    if (options?.signal?.aborted) throw new Error("Import cancelled");

    // Execute single ACID SQLite transaction
    await runDb(async (db) => {
      await db.withTransactionAsync(async () => {
        await db.runAsync("DELETE FROM entry_tags");
        await db.runAsync("DELETE FROM tags");
        await db.runAsync("DELETE FROM entries");

        // 1. Insert tags
        for (const tag of rawTimeline.tags) {
          await db.runAsync(
            `INSERT INTO tags (id, name, key, color_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            tag.id,
            tag.name,
            tag.key,
            tag.colorId,
            tag.createdAt,
            tag.updatedAt
          );
        }

        // 2. Insert entries & entry_tags
        for (const entry of rawTimeline.entries) {
          const imagesJson = entry.images?.length ? JSON.stringify(entry.images) : null;
          const audiosJson = entry.audios?.length ? JSON.stringify(entry.audios) : null;
          const attachmentsJson = entry.attachments?.length
            ? JSON.stringify(entry.attachments)
            : null;
          const lat = entry.location?.latitude ?? null;
          const lng = entry.location?.longitude ?? null;
          const locationName = entry.location?.name ?? null;

          await db.runAsync(
            `INSERT INTO entries (
               id, created_at, updated_at, text, images, audios, attachments,
               latitude, longitude, location
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            entry.id,
            entry.createdAt,
            entry.updatedAt,
            entry.text ?? null,
            imagesJson,
            audiosJson,
            attachmentsJson,
            lat,
            lng,
            locationName
          );

          if (entry.tagIds && entry.tagIds.length > 0) {
            for (const tagId of entry.tagIds) {
              await db.runAsync(
                "INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
                entry.id,
                tagId
              );
            }
          }
        }

        // 3. Update settings if present
        if (rawTimeline.settings) {
          for (const [key, value] of Object.entries(rawTimeline.settings)) {
            await db.runAsync(
              "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
              key,
              value
            );
          }
        }

        // 4. Rebuild FTS5 search index
        await db.runAsync("INSERT INTO entries_fts(entries_fts) VALUES ('rebuild')");
      });
    });

    // Copy media files to live media directory
    const liveMediaDir = mediaDirectory();
    liveMediaDir.create({ idempotent: true, intermediates: true });

    if (stagingMediaDir.exists) {
      const stagedItems = stagingMediaDir.list();
      for (const item of stagedItems) {
        if (item instanceof File && item.exists) {
          const target = new File(liveMediaDir, item.name);
          await item.copy(target, { overwrite: true });
        }
      }
    }

    notifyStoreReload();

    return { importedCount: rawTimeline.entries.length };
  } finally {
    if (stagingDir.exists) {
      try {
        stagingDir.delete();
      } catch {
        // ignore
      }
    }
  }
}
