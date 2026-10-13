import { Directory, File, FileMode, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { defaultDatabaseDirectory } from "expo-sqlite";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

import { notifyStoreReload } from "@/modules/entry/store/EntryStore";
import { runDb } from "@/services/db/database";
import { mediaDirectory } from "@/services/media/storage";
import { logDevWarning, reportError } from "@/shared/utils/devLog";
import {
  acquireImportGate,
  assertBackupCounts,
  assertBackupManifest,
  assertBackupMediaReferences,
  assertBackupTimelineData,
  BACKUP_LIMITS,
  calculateRequiredImportBytes,
  extractMediaFilename,
  releaseImportGate,
  validateArchivePath,
  waitForExportGate,
} from "../utils";
import {
  type ImportBackupOptions,
  type ImportBackupResult,
  MANIFEST_FILENAME,
  TIMELINE_DATA_FILENAME,
} from "../utils/types";
import { replaceTimelineData } from "./timeline";

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

/** Names that a case-insensitive filesystem treats as one file share a key. */
function mediaNameKey(filename: string): string {
  return filename.normalize("NFC").toLocaleLowerCase("en-US");
}

function deleteLiveMedia(filenames: readonly string[]): void {
  const directory = mediaDirectory();
  for (const filename of filenames) {
    try {
      const file = new File(directory, filename);
      if (file.exists) file.delete();
    } catch (error) {
      reportError("backup:deleteLiveMedia", error);
    }
  }
}

/**
 * Moves staged media beside the live files and returns the names it added.
 * Media files are immutable and UUID-named, so an existing name already holds that file.
 */
async function publishStagedMedia(
  stagedMedia: Directory,
  mediaNames: ReadonlySet<string>
): Promise<string[]> {
  const live = mediaDirectory();
  live.create({ idempotent: true, intermediates: true });
  const added: string[] = [];
  try {
    for (const filename of mediaNames) {
      const destination = new File(live, filename);
      if (destination.exists) continue;
      await new File(stagedMedia, filename).move(destination);
      added.push(filename);
    }
    for (const filename of mediaNames) {
      if (!new File(live, filename).exists) {
        throw new Error("Import media verification failed.");
      }
    }
  } catch (error) {
    deleteLiveMedia(added);
    throw error;
  }
  return added;
}

/** Removes media the restored timeline does not use. Best effort: leftovers are only unreferenced files. */
function pruneReplacedMedia(mediaNames: ReadonlySet<string>): void {
  try {
    const live = mediaDirectory();
    if (!live.exists) return;
    const kept = new Set([...mediaNames].map(mediaNameKey));
    const replaced = live
      .list()
      .filter((item) => item instanceof File && !kept.has(mediaNameKey(item.name)))
      .map((item) => item.name);
    deleteLiveMedia(replaced);
  } catch (error) {
    reportError("backup:pruneReplacedMedia", error);
  }
}

/** True when Import needs the explicit destructive confirmation. */
export async function hasLocalContentForImport(): Promise<boolean> {
  const hasEntries = await runDb(async (db) => {
    const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM entries");
    return (row?.count ?? 0) > 0;
  });
  if (hasEntries) return true;
  const media = mediaDirectory();
  return media.exists && media.list().some((item) => item instanceof File && item.exists);
}

/**
 * Validates and stages a structured backup before replacing local content in-session.
 */
export async function importBackupArchive(
  fileUri: string,
  options?: ImportBackupOptions
): Promise<ImportBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Selected backup file does not exist.");
  const archiveBytes = sourceFile.info().size ?? 0;
  if (archiveBytes > BACKUP_LIMITS.archiveBytes) {
    throw new Error("Backup file is too large to import.");
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
  const requiredBytes = calculateRequiredImportBytes({
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
        "Insufficient storage to import backup. OpenLog requires free space for staging."
      );
    }
  }

  await waitForExportGate();
  acquireImportGate();

  const manifestChunks: Uint8Array[] = [];
  const timelineChunks: Uint8Array[] = [];
  let failure: Error | null = null;
  let totalUncompressed = 0;
  let manifestBytes = 0;
  let timelineBytes = 0;
  let mediaCount = 0;
  let stagingDir: Directory | null = null;
  const paths = new Set<string>();
  const mediaNames = new Set<string>();
  const normalizedMediaNames = new Set<string>();

  try {
    stagingDir = new Directory(Paths.cache, `openlog-import-${Date.now()}`);
    stagingDir.create({ idempotent: true, intermediates: true });
    const stagingMediaDir = new Directory(stagingDir, "incoming-media");
    stagingMediaDir.create({ intermediates: true });

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
          const filenameKey = mediaNameKey(filename);
          if (normalizedMediaNames.has(filenameKey)) {
            throw new Error("Invalid backup file: duplicate media filename.");
          }
          normalizedMediaNames.add(filenameKey);
          mediaNames.add(filename);
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
          failure = new Error("Invalid backup file: archive expands beyond the import limit.");
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

    assertBackupCounts({ manifest: rawManifest, timeline: rawTimeline, mediaCount });
    assertBackupMediaReferences(rawTimeline.entries, mediaNames);
    if (options?.counts) {
      if (
        options.counts.entry !== rawManifest.counts.entry ||
        options.counts.media !== rawManifest.counts.media
      ) {
        throw new Error("Backup counts do not match the expected counts.");
      }
    }
    if (options?.signal?.aborted) throw new Error("Import cancelled");

    // Existing content is only removed after the new rows commit.
    const addedMedia = await publishStagedMedia(stagingMediaDir, mediaNames);
    try {
      await runDb((db) => replaceTimelineData(db, rawTimeline));
    } catch (error) {
      deleteLiveMedia(addedMedia);
      throw error;
    }
    pruneReplacedMedia(mediaNames);

    try {
      notifyStoreReload();
    } catch (error) {
      reportError("backup:importReload", error);
    }

    return { importedCount: rawTimeline.entries.length };
  } catch (error) {
    throw error instanceof Error ? error : new Error("The import could not be completed.");
  } finally {
    if (stagingDir?.exists) {
      try {
        stagingDir.delete();
      } catch (error) {
        logDevWarning("backup:importStagingCleanup", error);
      }
    }
    releaseImportGate();
  }
}
