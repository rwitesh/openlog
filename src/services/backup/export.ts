import { File, FileMode, Paths } from "expo-file-system";
import { strToU8, Zip, ZipDeflate, ZipPassThrough } from "fflate";

import { getEntriesCount, getEntriesPage } from "@/services/db/entries";
import { APP_SLUG } from "@/shared/constants";
import type { Entry } from "@/shared/types";
import { APP_VERSION } from "@/shared/utils/appInfo";
import { logDevWarning } from "@/shared/utils/devLog";

import {
  entryToPreview,
  formatDateForFilename,
  type MediaItem,
  normalizeAttachments,
  normalizeMediaUris,
} from "./shared";
import {
  ARCHIVE_EXTENSION,
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  type ArchiveManifest,
  type ArchivePreviewEntry,
  type ExportBackupOptions,
  type ExportBackupResult,
} from "./types";

/**
 * Creates a complete portable archive containing the database dump
 * (`manifest.json` + `db.json`) and all attached photos and voice recordings (`media/`).
 * Uses disk streaming and paged SQLite reads to keep memory flat on large timelines.
 */
export async function exportBackupArchive(
  options?: ExportBackupOptions
): Promise<ExportBackupResult> {
  if (options?.signal?.aborted) throw new Error("Backup cancelled");

  const createdAt = Date.now();
  const filename = `${APP_SLUG}-backup-${formatDateForFilename(createdAt)}${ARCHIVE_EXTENSION}`;
  const exportFile = new File(Paths.cache, filename);
  exportFile.create({ overwrite: true });
  const handle = exportFile.open(FileMode.WriteOnly);

  const mediaToExport: MediaItem[] = [];
  let processedEntries = 0;
  const counts = { entry: 0, images: 0, audio: 0, attachments: 0 };
  let isSuccess = false;

  try {
    const zipStream = new Zip((err, chunk) => {
      if (err) throw err;
      handle.writeBytes(chunk);
    });

    const totalEntries = await getEntriesCount();
    const previewEntries: ArchivePreviewEntry[] = [];

    const dbEntry = new ZipDeflate("db.json", { level: 6 });
    zipStream.add(dbEntry);
    dbEntry.push(strToU8('{"entries":[\n'), false);

    const PAGE_SIZE = 100;
    let isFirstEntry = true;

    for (let offset = 0; offset < totalEntries; offset += PAGE_SIZE) {
      if (options?.signal?.aborted) throw new Error("Backup cancelled");

      const page = await getEntriesPage(offset, PAGE_SIZE);
      if (page.length === 0) break;

      let pageChunk = "";

      for (const entry of page) {
        const images = normalizeMediaUris(entry.images ?? [], mediaToExport);
        const audios = normalizeMediaUris(entry.audios ?? [], mediaToExport);
        const attachments = normalizeAttachments(entry.attachments, mediaToExport);

        const normalizedEntry: Entry = {
          ...entry,
          images: images.paths,
          audios: audios.paths,
          attachments: attachments.attachments,
        };

        counts.images += normalizedEntry.images.length;
        counts.audio += normalizedEntry.audios.length;
        counts.attachments += normalizedEntry.attachments.length;

        if (previewEntries.length < 3) {
          previewEntries.push(entryToPreview(normalizedEntry));
        }

        if (!isFirstEntry) pageChunk += ",\n";
        isFirstEntry = false;
        pageChunk += JSON.stringify(normalizedEntry);
        processedEntries++;
      }

      dbEntry.push(strToU8(pageChunk), false);
      options?.onProgress?.(processedEntries, totalEntries, "entries");
    }

    dbEntry.push(strToU8("\n]}\n"), true);

    if (options?.signal?.aborted) throw new Error("Backup cancelled");

    counts.entry = processedEntries;

    const manifest: ArchiveManifest = {
      format: ARCHIVE_FORMAT,
      version: ARCHIVE_SCHEMA_VERSION,
      createdAt,
      appVersion: APP_VERSION ?? "1.0.0",
      counts,
      previewEntries,
    };

    const manifestEntry = new ZipDeflate("manifest.json", { level: 6 });
    zipStream.add(manifestEntry);
    manifestEntry.push(strToU8(JSON.stringify(manifest, null, 2)), true);

    const CHUNK_SIZE = 256 * 1024;
    const totalMedia = mediaToExport.length;
    let processedMedia = 0;

    for (const item of mediaToExport) {
      if (options?.signal?.aborted) throw new Error("Backup cancelled");

      try {
        const sourceFile = new File(item.localUri);
        if (sourceFile.exists) {
          const mediaEntry = new ZipPassThrough(item.path);
          zipStream.add(mediaEntry);
          const readHandle = sourceFile.open(FileMode.ReadOnly);
          try {
            const fileSize = readHandle.size ?? 0;
            let bytesRead = 0;
            while (bytesRead < fileSize) {
              if (options?.signal?.aborted) throw new Error("Backup cancelled");
              const chunk = readHandle.readBytes(Math.min(CHUNK_SIZE, fileSize - bytesRead));
              if (chunk.length === 0) break;
              bytesRead += chunk.length;
              mediaEntry.push(chunk, bytesRead >= fileSize);
            }
            if (fileSize === 0) mediaEntry.push(new Uint8Array(0), true);
          } finally {
            readHandle.close();
          }
        } else {
          logDevWarning("exportBackupArchive:missingMedia", item.path);
        }
      } catch (err) {
        if (options?.signal?.aborted) throw err;
        logDevWarning("exportBackupArchive:streamMedia", err);
      }
      processedMedia++;
      options?.onProgress?.(processedMedia, totalMedia, "media");
    }

    if (options?.signal?.aborted) throw new Error("Backup cancelled");

    zipStream.end();
    isSuccess = true;
  } finally {
    handle.close();
    if (!isSuccess) {
      try {
        if (exportFile.exists) exportFile.delete();
      } catch (cleanupErr) {
        logDevWarning("exportBackupArchive:cleanupFailed", cleanupErr);
      }
    }
  }

  const finalInfo = exportFile.info();

  return {
    fileUri: exportFile.uri,
    filename,
    counts: { ...counts, entry: processedEntries },
    byteSize: finalInfo.size ?? 0,
  };
}
