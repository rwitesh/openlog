import { File, FileMode, Paths } from "expo-file-system";
import { strToU8, Zip, ZipDeflate, ZipPassThrough } from "fflate";

import { runDb } from "@/services/db/database";
import { parseAttachments, parseUris } from "@/services/db/uris";
import { mediaDirectory } from "@/services/media/storage";
import { APP_VERSION } from "@/shared/utils/appInfo";
import { logDevWarning } from "@/shared/utils/devLog";
import {
  acquireExportGate,
  assertBackupArchiveSize,
  assertBackupExportSizeLimits,
  DATABASE_SIZE_CEILING,
  releaseExportGate,
  waitForRestoreGate,
} from "../utils";
import {
  ARCHIVE_EXTENSION,
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  type BackupEntry,
  type BackupLocation,
  type BackupManifest,
  type BackupTag,
  type BackupTimelineData,
  type ExportBackupOptions,
  type ExportBackupResult,
  MANIFEST_FILENAME,
  TIMELINE_DATA_FILENAME,
} from "../utils/types";

export { DATABASE_SIZE_CEILING };

const CHUNK_SIZE = 256 * 1024;

function listMediaFiles(): File[] {
  const dir = mediaDirectory();
  if (!dir.exists) return [];
  const files: File[] = [];
  for (const item of dir.list()) {
    if (item instanceof File && item.exists) {
      files.push(item);
    } else {
      logDevWarning("backup:export", `Skipping non-file media item: ${item.name}`);
    }
  }
  return files;
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

/**
 * Creates a structured JSON archive containing timeline.json and media files.
 */
export async function exportBackupArchive(
  options?: ExportBackupOptions
): Promise<ExportBackupResult> {
  if (options?.signal?.aborted) throw new Error("Backup cancelled");

  await waitForRestoreGate();
  acquireExportGate();
  const createdAt = Date.now();
  const filename = `openlog-backup-${new Date(createdAt).toISOString().replace(/[:.]/g, "-")}${ARCHIVE_EXTENSION}`;
  const exportFile = new File(Paths.cache, filename);
  exportFile.create({ overwrite: true });
  const output = exportFile.open(FileMode.WriteOnly);
  let succeeded = false;

  try {
    const { tags, entries, settings } = await runDb(async (db) => {
      const tagRows = await db.getAllAsync<{
        id: string;
        name: string;
        key: string;
        color_id: string;
        created_at: number;
        updated_at: number;
      }>(
        "SELECT id, name, key, color_id, created_at, updated_at FROM tags ORDER BY name COLLATE NOCASE, id"
      );
      const mappedTags: BackupTag[] = tagRows.map((row) => ({
        id: row.id,
        name: row.name,
        key: row.key,
        colorId: row.color_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const entryTagRows = await db.getAllAsync<{
        entry_id: string;
        tag_id: string;
      }>("SELECT entry_id, tag_id FROM entry_tags ORDER BY entry_id, tag_id");
      const tagIdsByEntryId = new Map<string, string[]>();
      for (const row of entryTagRows) {
        const existing = tagIdsByEntryId.get(row.entry_id) ?? [];
        existing.push(row.tag_id);
        tagIdsByEntryId.set(row.entry_id, existing);
      }

      const entryRows = await db.getAllAsync<{
        id: string;
        created_at: number;
        updated_at: number;
        text: string | null;
        images: string | null;
        audios: string | null;
        attachments: string | null;
        latitude: number | null;
        longitude: number | null;
        location: string | null;
      }>(
        "SELECT id, created_at, updated_at, text, images, audios, attachments, latitude, longitude, location FROM entries ORDER BY created_at DESC, id DESC"
      );

      const mappedEntries: BackupEntry[] = entryRows.map((row) => {
        const images = parseUris(row.images);
        const audios = parseUris(row.audios);
        const attachments = parseAttachments(row.attachments).map((att) => ({
          uri: att.uri,
          name: att.name,
          size: att.size,
          mimeType: att.mime,
        }));

        const location: BackupLocation | null =
          row.latitude != null && row.longitude != null
            ? {
                latitude: row.latitude,
                longitude: row.longitude,
                name: row.location ?? undefined,
              }
            : null;

        return {
          id: row.id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          text: row.text ?? null,
          images: images.length > 0 ? images : undefined,
          audios: audios.length > 0 ? audios : undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
          tagIds: tagIdsByEntryId.get(row.id),
          location,
        };
      });

      const settingRows = await db.getAllAsync<{
        key: string;
        value: string;
      }>("SELECT key, value FROM settings ORDER BY key");
      const mappedSettings: Record<string, string> = {};
      for (const row of settingRows) {
        mappedSettings[row.key] = row.value;
      }

      return {
        tags: mappedTags,
        entries: mappedEntries,
        settings: mappedSettings,
      };
    });

    options?.onProgress?.(entries.length, entries.length, "entries");
    if (options?.signal?.aborted) throw new Error("Backup cancelled");

    const mediaFiles = listMediaFiles().filter((f) => f.exists);

    const manifest: BackupManifest = {
      format: ARCHIVE_FORMAT,
      version: ARCHIVE_SCHEMA_VERSION,
      createdAt,
      appVersion: APP_VERSION ?? "1.0.0",
      counts: {
        entry: entries.length,
        tag: tags.length,
        media: mediaFiles.length,
      },
    };

    const timelineData: BackupTimelineData = {
      tags,
      entries,
      settings: Object.keys(settings).length > 0 ? settings : undefined,
    };

    const manifestBytes = strToU8(JSON.stringify(manifest));
    const timelineBytes = strToU8(JSON.stringify(timelineData));
    assertBackupExportSizeLimits({
      manifestBytes: manifestBytes.length,
      timelineBytes: timelineBytes.length,
      mediaBytes: mediaFiles.map((file) => file.info().size ?? 0),
    });

    let archiveBytes = 0;
    let archiveError: Error | null = null;
    const zip = new Zip((error, chunk) => {
      if (error) {
        archiveError = error;
        return;
      }
      if (archiveError) return;
      try {
        assertBackupArchiveSize(archiveBytes + chunk.length);
      } catch (sizeError) {
        archiveError = sizeError instanceof Error ? sizeError : new Error(String(sizeError));
        return;
      }
      output.writeBytes(chunk);
      archiveBytes += chunk.length;
    });

    const manifestFile = new ZipDeflate(MANIFEST_FILENAME, { level: 6 });
    zip.add(manifestFile);
    manifestFile.push(manifestBytes, true);

    const timelineJsonFile = new ZipDeflate(TIMELINE_DATA_FILENAME, { level: 6 });
    zip.add(timelineJsonFile);
    timelineJsonFile.push(timelineBytes, true);

    let exportedMediaCount = 0;
    for (let index = 0; index < mediaFiles.length; index++) {
      if (options?.signal?.aborted) throw new Error("Backup cancelled");
      const mediaFile = mediaFiles[index];
      const added = addFileToArchive(zip, `media/${mediaFile.name}`, mediaFile, options?.signal);
      if (added) exportedMediaCount++;
      options?.onProgress?.(index + 1, mediaFiles.length, "media");
    }

    zip.end();
    if (archiveError) throw archiveError;
    succeeded = true;

    return {
      fileUri: exportFile.uri,
      filename,
      counts: {
        entry: entries.length,
        tag: tags.length,
        media: exportedMediaCount,
      },
      byteSize: archiveBytes,
    };
  } finally {
    output.close();
    releaseExportGate();
    if (!succeeded && exportFile.exists) exportFile.delete();
  }
}
