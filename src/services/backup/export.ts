import { Directory, File, FileMode, Paths } from "expo-file-system";
import { strToU8, Zip, ZipDeflate, ZipPassThrough } from "fflate";

import {
  createDatabaseSnapshot,
  DATABASE_SIZE_CEILING,
  deleteDatabaseSnapshot,
  withDatabaseLock,
} from "@/services/db/database";
import { APP_SLUG } from "@/shared/constants";
import { APP_VERSION } from "@/shared/utils/appInfo";
import { logDevWarning } from "@/shared/utils/devLog";

import { acquireExportGate, releaseExportGate } from "./shared";
import {
  ARCHIVE_EXTENSION,
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  type ArchiveManifest,
  type ExportBackupOptions,
  type ExportBackupResult,
} from "./types";

/**
 * Backups are constrained by {@link DATABASE_SIZE_CEILING} (256 MiB) because
 * SQLite serialization loads the entire database into JavaScript memory.
 */
export { DATABASE_SIZE_CEILING };

const CHUNK_SIZE = 256 * 1024;

function backupId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDateForFilename(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function listMediaFiles(): File[] {
  const mediaDirectory = new Directory(Paths.document, "media");
  if (!mediaDirectory.exists) return [];
  const items = mediaDirectory.list();
  if (items.some((item) => !(item instanceof File))) {
    throw new Error("Cannot back up media: the media directory contains nested folders.");
  }
  return items as File[];
}

function addFileToArchive(
  zip: Zip,
  archivePath: string,
  sourceFile: File,
  signal?: AbortSignal
): boolean {
  if (!sourceFile.exists) {
    logDevWarning(
      "backup:export",
      `Cannot back up file: ${sourceFile.name} is no longer available.`
    );
    return false;
  }
  const archiveFile = new ZipPassThrough(archivePath);
  zip.add(archiveFile);
  const source = sourceFile.open(FileMode.ReadOnly);
  try {
    const size = source.size ?? 0;
    let read = 0;
    while (read < size) {
      if (signal?.aborted) throw new Error("Backup cancelled");
      const chunk = source.readBytes(Math.min(CHUNK_SIZE, size - read));
      if (chunk.length === 0) {
        if (read < size) {
          throw new Error(`Cannot read ${sourceFile.name} while backing up.`);
        }
        break;
      }
      read += chunk.length;
      archiveFile.push(chunk, read === size);
    }
    if (size === 0) archiveFile.push(new Uint8Array(0), true);
    return true;
  } finally {
    source.close();
  }
}

/** Creates an opaque, complete timeline backup: a SQLite snapshot plus the durable media directory. */
export async function exportBackupArchive(
  options?: ExportBackupOptions
): Promise<ExportBackupResult> {
  if (options?.signal?.aborted) throw new Error("Backup cancelled");

  acquireExportGate();
  const createdAt = Date.now();
  const id = backupId();
  const filename = `${APP_SLUG}-backup-${formatDateForFilename(createdAt)}${ARCHIVE_EXTENSION}`;
  const exportFile = new File(Paths.cache, filename);
  const snapshotName = `openlog-export-${id}.sqlite`;
  const snapshotFile = new File(Paths.cache, snapshotName);
  exportFile.create({ overwrite: true });
  const output = exportFile.open(FileMode.WriteOnly);
  let succeeded = false;

  try {
    // Atomically snapshot SQLite and capture media file list under the DB lock
    // so no database mutations or destructive media cleanup can interleave.
    const { entryCount, mediaFiles } = await withDatabaseLock(async () => {
      const count = await createDatabaseSnapshot(snapshotFile);
      const files = listMediaFiles();
      return { entryCount: count, mediaFiles: files };
    });

    options?.onProgress?.(1, 1, "database");
    if (options?.signal?.aborted) throw new Error("Backup cancelled");

    const zip = new Zip((error, chunk) => {
      if (error) throw error;
      output.writeBytes(chunk);
    });

    const addedDb = addFileToArchive(zip, "database.sqlite", snapshotFile, options?.signal);
    if (!addedDb) {
      throw new Error("Database snapshot file is no longer available.");
    }

    let exportedMediaCount = 0;
    for (let index = 0; index < mediaFiles.length; index++) {
      if (options?.signal?.aborted) throw new Error("Backup cancelled");
      const mediaFile = mediaFiles[index];
      const added = addFileToArchive(zip, `media/${mediaFile.name}`, mediaFile, options?.signal);
      if (added) exportedMediaCount++;
      options?.onProgress?.(index + 1, mediaFiles.length, "media");
    }

    const manifest: ArchiveManifest = {
      format: ARCHIVE_FORMAT,
      version: ARCHIVE_SCHEMA_VERSION,
      createdAt,
      appVersion: APP_VERSION ?? "1.0.0",
      counts: { entry: entryCount, media: exportedMediaCount },
    };

    const manifestFile = new ZipDeflate("manifest.json", { level: 6 });
    zip.add(manifestFile);
    manifestFile.push(strToU8(JSON.stringify(manifest)), true);
    zip.end();
    succeeded = true;

    return {
      fileUri: exportFile.uri,
      filename,
      counts: manifest.counts,
      byteSize: exportFile.info().size ?? 0,
    };
  } finally {
    output.close();
    releaseExportGate();
    if (snapshotFile.exists) await deleteDatabaseSnapshot(snapshotFile);
    if (!succeeded && exportFile.exists) exportFile.delete();
  }
}
