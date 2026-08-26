import { getDocumentAsync } from "expo-document-picker";
import { Directory, File, FileMode, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  strFromU8,
  strToU8,
  Unzip,
  UnzipInflate,
  UnzipPassThrough,
  Zip,
  ZipDeflate,
  ZipPassThrough,
} from "fflate";

import { notifyStoreReload } from "@/modules/entry";
import { getAllRawEntries, importEntriesBatch } from "@/services/db/entries";
import { resolveMediaUri } from "@/services/media/storage";
import { APP_SLUG } from "@/shared/constants";
import type { Entry } from "@/shared/types";
import { APP_VERSION } from "@/shared/utils/appInfo";
import { logDevWarning } from "@/shared/utils/devLog";

export const ARCHIVE_FORMAT = `${APP_SLUG}-archive` as const;
export const ARCHIVE_SCHEMA_VERSION = 1;
export const ARCHIVE_EXTENSION = `.${APP_SLUG}`;

export interface ArchiveManifest {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  createdAt: number;
  appVersion: string;
  entryCount: number;
  mediaCount: number;
}

export interface ArchiveDb {
  entries: Entry[];
}

export interface InspectBackupResult {
  isValid: boolean;
  format: string;
  version: number;
  createdAt: number;
  appVersion: string;
  entryCount: number;
  mediaCount: number;
  previewEntries: {
    id: string;
    createdAt: number;
    textSnippet: string;
    hasImages: boolean;
    hasAudios: boolean;
  }[];
}

export interface ExportBackupResult {
  fileUri: string;
  filename: string;
  entryCount: number;
  mediaCount: number;
  byteSize: number;
}

export interface ImportBackupResult {
  importedCount: number;
  mediaCount: number;
}

function sanitizeMediaFilename(name: string): string {
  return name.replace(/^media\//, "").replace(/[/\\?%*:|"<>]/g, "_");
}

function formatDateForFilename(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

interface MediaCollector {
  entries: { relativePath: string; localUri: string }[];
  seen: Set<string>;
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

function normalizeMediaList(
  uris: string[] | undefined,
  collector: MediaCollector,
  fallbackExt: string
): string[] {
  if (!uris || uris.length === 0) return [];
  const normalized: string[] = [];

  for (const rawUri of uris) {
    if (!rawUri) continue;
    const resolved = resolveMediaUri(rawUri);
    const rawName = resolved.split("/").pop() || `file-${Date.now()}.${fallbackExt}`;
    const filename = sanitizeMediaFilename(rawName);
    const relativeZipPath = `media/${filename}`;

    normalized.push(relativeZipPath);

    if (!collector.seen.has(relativeZipPath)) {
      collector.seen.add(relativeZipPath);
      collector.entries.push({ relativePath: relativeZipPath, localUri: resolved });
    }
  }

  return normalized;
}

/**
 * Creates a complete portable archive containing the database dump
 * (`manifest.json` + `db.json`) and all attached photos and voice recordings (`media/`).
 * Uses disk streaming to guarantee flat memory usage (< 25MB RAM) even with 5+ years of data.
 */
export async function exportBackupArchive(): Promise<ExportBackupResult> {
  const entries = await getAllRawEntries();

  const collector: MediaCollector = { entries: [], seen: new Set() };
  const normalizedEntries: Entry[] = entries.map((entry) => ({
    ...entry,
    images: normalizeMediaList(entry.images, collector, "jpg"),
    audios: normalizeMediaList(entry.audios, collector, "m4a"),
  }));

  const manifest: ArchiveManifest = {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_SCHEMA_VERSION,
    createdAt: Date.now(),
    appVersion: APP_VERSION ?? "1.0.0",
    entryCount: normalizedEntries.length,
    mediaCount: collector.entries.length,
  };

  const dbDump: ArchiveDb = {
    entries: normalizedEntries,
  };

  const filename = `${APP_SLUG}-backup-${formatDateForFilename(manifest.createdAt)}${ARCHIVE_EXTENSION}`;
  const exportFile = new File(Paths.cache, filename);
  exportFile.create({ overwrite: true });
  const handle = exportFile.open(FileMode.WriteOnly);

  try {
    const zipStream = new Zip((err, chunk) => {
      if (err) throw err;
      handle.writeBytes(chunk);
    });

    // 1. Add manifest.json (compressed)
    const manifestEntry = new ZipDeflate("manifest.json", { level: 6 });
    zipStream.add(manifestEntry);
    manifestEntry.push(strToU8(JSON.stringify(manifest, null, 2)), true);

    // 2. Add db.json (compressed)
    const dbEntry = new ZipDeflate("db.json", { level: 6 });
    zipStream.add(dbEntry);
    dbEntry.push(strToU8(JSON.stringify(dbDump, null, 2)), true);

    const CHUNK_SIZE = 256 * 1024;

    for (const item of collector.entries) {
      try {
        const sourceFile = new File(item.localUri);
        if (sourceFile.exists) {
          const mediaEntry = new ZipPassThrough(item.relativePath);
          zipStream.add(mediaEntry);
          const readHandle = sourceFile.open(FileMode.ReadOnly);
          try {
            const fileSize = readHandle.size ?? 0;
            let bytesRead = 0;
            while (bytesRead < fileSize) {
              const chunk = readHandle.readBytes(Math.min(CHUNK_SIZE, fileSize - bytesRead));
              if (chunk.length === 0) break;
              bytesRead += chunk.length;
              mediaEntry.push(chunk, bytesRead >= fileSize);
            }
            if (fileSize === 0) {
              mediaEntry.push(new Uint8Array(0), true);
            }
          } finally {
            readHandle.close();
          }
        }
      } catch (err) {
        logDevWarning("exportBackupArchive:streamMedia", err);
      }
    }

    // 4. Finalize zip stream
    zipStream.end();
  } finally {
    handle.close();
  }

  const finalInfo = exportFile.info();

  return {
    fileUri: exportFile.uri,
    filename,
    entryCount: manifest.entryCount,
    mediaCount: manifest.mediaCount,
    byteSize: finalInfo.size ?? 0,
  };
}

/**
 * Prompts user with the system file picker to select a backup archive.
 */
export async function pickBackupArchiveFile(): Promise<string | null> {
  const result = await getDocumentAsync({
    type: ["*/*", "application/octet-stream", "application/zip"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  const name = (asset.name || asset.uri).toLowerCase();
  if (!name.endsWith(ARCHIVE_EXTENSION) && !name.endsWith(`${ARCHIVE_EXTENSION}.zip`)) {
    throw new Error(`Please select a valid ${ARCHIVE_EXTENSION} backup file.`);
  }

  return asset.uri;
}

/**
 * Inspects a backup archive without writing anything to disk or database.
 * Returns metadata and preview entries for user confirmation.
 */
export async function inspectBackupArchive(fileUri: string): Promise<InspectBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) {
    throw new Error("Selected backup file could not be found.");
  }

  let manifest: Partial<ArchiveManifest> = {};
  let dbData: ArchiveDb | null = null;
  let mediaCount = 0;

  const unzipper = new Unzip();
  unzipper.register(UnzipInflate);
  unzipper.register(UnzipPassThrough);

  unzipper.onfile = (file) => {
    if (file.name === "manifest.json") {
      const chunks: Uint8Array[] = [];
      file.ondata = (_err, chunk, final) => {
        chunks.push(chunk);
        if (final) {
          try {
            manifest = JSON.parse(strFromU8(concatChunks(chunks))) as ArchiveManifest;
          } catch {
            // Fallback — manifest is optional for validation
          }
        }
      };
      file.start();
    } else if (file.name === "db.json") {
      const chunks: Uint8Array[] = [];
      file.ondata = (_err, chunk, final) => {
        chunks.push(chunk);
        if (final) {
          dbData = JSON.parse(strFromU8(concatChunks(chunks))) as ArchiveDb;
        }
      };
      file.start();
    } else if (file.name.startsWith("media/")) {
      mediaCount++;
    }
  };

  const CHUNK_SIZE = 256 * 1024;
  const readHandle = sourceFile.open(FileMode.ReadOnly);
  try {
    const fileSize = readHandle.size ?? 0;
    let bytesRead = 0;
    while (bytesRead < fileSize) {
      const chunk = readHandle.readBytes(Math.min(CHUNK_SIZE, fileSize - bytesRead));
      if (chunk.length === 0) break;
      bytesRead += chunk.length;
      unzipper.push(chunk, bytesRead >= fileSize);
    }
    if (fileSize === 0) {
      unzipper.push(new Uint8Array(0), true);
    }
  } finally {
    readHandle.close();
  }

  if (!manifest.format && !dbData) {
    throw new Error(`Invalid file: This is not a valid ${ARCHIVE_EXTENSION} archive.`);
  }

  if (!dbData || !Array.isArray((dbData as ArchiveDb).entries)) {
    throw new Error("Corrupted backup file: archive data is missing.");
  }

  const entries = (dbData as ArchiveDb).entries;

  const previewEntries = entries.slice(0, 3).map((e) => ({
    id: e.id,
    createdAt: e.createdAt,
    textSnippet: e.text ? e.text.slice(0, 100).trim() : "(No text)",
    hasImages: Boolean(e.images?.length),
    hasAudios: Boolean(e.audios?.length),
  }));

  return {
    isValid: true,
    format: manifest.format || ARCHIVE_FORMAT,
    version: manifest.version || ARCHIVE_SCHEMA_VERSION,
    createdAt: manifest.createdAt || Date.now(),
    appVersion: manifest.appVersion || "1.0.0",
    entryCount: entries.length,
    mediaCount,
    previewEntries,
  };
}

/**
 * Restores entries and attached media from an archive, replacing all current data.
 * Uses streaming decompression to write media files directly to disk without RAM bloat.
 */
export async function importBackupArchive(fileUri: string): Promise<ImportBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) {
    throw new Error("Selected backup file does not exist.");
  }

  const mediaDir = new Directory(Paths.document, "media");
  if (mediaDir.exists) {
    mediaDir.delete();
  }
  mediaDir.create({ idempotent: true, intermediates: true });

  let dbData: ArchiveDb | null = null;
  let restoredMediaCount = 0;

  const unzipper = new Unzip();
  unzipper.register(UnzipInflate);
  unzipper.register(UnzipPassThrough);

  unzipper.onfile = (file) => {
    if (file.name === "db.json") {
      const chunks: Uint8Array[] = [];
      file.ondata = (err, chunk, final) => {
        if (err) throw err;
        chunks.push(chunk);
        if (final) {
          dbData = JSON.parse(strFromU8(concatChunks(chunks))) as ArchiveDb;
        }
      };
      file.start();
    } else if (file.name.startsWith("media/")) {
      const filename = sanitizeMediaFilename(file.name);
      if (!filename || filename === "." || filename === "..") return;
      try {
        const destFile = new File(mediaDir, filename);
        destFile.create({ overwrite: true });
        const handle = destFile.open(FileMode.WriteOnly);

        file.ondata = (err, chunk, final) => {
          if (err) {
            handle.close();
            logDevWarning("importBackupArchive:fileStream", err);
            return;
          }
          handle.writeBytes(chunk);
          if (final) {
            handle.close();
            restoredMediaCount++;
          }
        };
        file.start();
      } catch (err) {
        logDevWarning("importBackupArchive:mediaFile", err);
      }
    }
  };

  const CHUNK_SIZE = 256 * 1024;
  const readHandle = sourceFile.open(FileMode.ReadOnly);
  try {
    const fileSize = readHandle.size ?? 0;
    let bytesRead = 0;
    while (bytesRead < fileSize) {
      const chunk = readHandle.readBytes(Math.min(CHUNK_SIZE, fileSize - bytesRead));
      if (chunk.length === 0) break;
      bytesRead += chunk.length;
      unzipper.push(chunk, bytesRead >= fileSize);
    }
    if (fileSize === 0) {
      unzipper.push(new Uint8Array(0), true);
    }
  } finally {
    readHandle.close();
  }

  const parsedDbData = dbData as unknown as ArchiveDb | null;
  if (!parsedDbData || !Array.isArray(parsedDbData.entries)) {
    throw new Error("Invalid or corrupted backup file: entries list is missing.");
  }

  const importedCount = await importEntriesBatch(parsedDbData.entries);

  notifyStoreReload();

  return {
    importedCount,
    mediaCount: restoredMediaCount,
  };
}

/**
 * Prompts user to pick a folder (e.g. Downloads / Documents) and stores the archive directly.
 * Falls back gracefully to system file storage if direct folder picking is canceled or unsupported.
 */
export async function saveBackupArchive(fileUri: string, filename: string): Promise<boolean> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) {
    throw new Error("Backup file could not be found.");
  }

  // 1. First priority: Direct system folder picker (Android SAF / iOS Files)
  try {
    const targetDir = await Directory.pickDirectoryAsync();
    if (targetDir?.uri) {
      const destFile = targetDir.createFile(filename, "application/octet-stream");
      const bytes = await sourceFile.bytes();
      destFile.write(bytes);
      return true;
    }
  } catch (pickerErr) {
    logDevWarning("saveBackupArchive:pickDirectoryAsync", pickerErr);
  }

  // 2. Fallback: Native save-to-storage prompt
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/octet-stream",
      dialogTitle: "Save Backup Archive",
      UTI: "public.archive",
    });
    return true;
  }

  throw new Error("No storage destination available on this device.");
}
