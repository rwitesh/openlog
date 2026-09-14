import { Directory, File, FileMode, Paths } from "expo-file-system";
import { strToU8, Zip, ZipDeflate, ZipPassThrough } from "fflate";

import { createDatabaseSnapshot, deleteDatabaseSnapshot } from "@/services/db/database";
import { APP_SLUG } from "@/shared/constants";
import { APP_VERSION } from "@/shared/utils/appInfo";

import {
  ARCHIVE_EXTENSION,
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  type ArchiveManifest,
  type ExportBackupOptions,
  type ExportBackupResult,
} from "./types";

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

function addFileToArchive(zip: Zip, archivePath: string, sourceFile: File): void {
  if (!sourceFile.exists) {
    throw new Error(`Cannot back up media: ${sourceFile.name} is no longer available.`);
  }
  const archiveFile = new ZipPassThrough(archivePath);
  zip.add(archiveFile);
  const source = sourceFile.open(FileMode.ReadOnly);
  try {
    const size = source.size ?? 0;
    let read = 0;
    while (read < size) {
      const chunk = source.readBytes(Math.min(CHUNK_SIZE, size - read));
      if (chunk.length === 0) throw new Error(`Cannot read ${sourceFile.name} while backing up.`);
      read += chunk.length;
      archiveFile.push(chunk, read === size);
    }
    if (size === 0) archiveFile.push(new Uint8Array(0), true);
  } finally {
    source.close();
  }
}

/** Creates an opaque, complete timeline backup: a SQLite snapshot plus the durable media directory. */
export async function exportBackupArchive(
  options?: ExportBackupOptions
): Promise<ExportBackupResult> {
  if (options?.signal?.aborted) throw new Error("Backup cancelled");

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
    const entryCount = await createDatabaseSnapshot(snapshotFile);
    options?.onProgress?.(1, 1, "database");
    if (options?.signal?.aborted) throw new Error("Backup cancelled");

    const mediaFiles = listMediaFiles();
    const manifest: ArchiveManifest = {
      format: ARCHIVE_FORMAT,
      version: ARCHIVE_SCHEMA_VERSION,
      createdAt,
      appVersion: APP_VERSION ?? "1.0.0",
      counts: { entry: entryCount, media: mediaFiles.length },
    };

    const zip = new Zip((error, chunk) => {
      if (error) throw error;
      output.writeBytes(chunk);
    });
    addFileToArchive(zip, "database.sqlite", snapshotFile);

    for (let index = 0; index < mediaFiles.length; index++) {
      if (options?.signal?.aborted) throw new Error("Backup cancelled");
      const mediaFile = mediaFiles[index];
      addFileToArchive(zip, `media/${mediaFile.name}`, mediaFile);
      options?.onProgress?.(index + 1, mediaFiles.length, "media");
    }

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
    if (snapshotFile.exists) await deleteDatabaseSnapshot(snapshotFile);
    if (!succeeded && exportFile.exists) exportFile.delete();
  }
}
