import { File, FileMode, Paths } from "expo-file-system";
import { strFromU8, Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

import { notifyStoreReload } from "@/modules/entry";
import { importEntriesBatched } from "@/services/db/entries";
import type { Entry } from "@/shared/types";

import {
  clearRestoreTransaction,
  createRestoreTransaction,
  RESTORE_MEDIA_DIR,
  RESTORE_NEXT_MEDIA_DIR,
  RESTORE_PREVIOUS_MEDIA_DIR,
  updateRestoreTransaction,
} from "./restoreTransaction";
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
  dbBytes: 256 * 1024 * 1024,
  entryBytes: 2 * 1024 * 1024,
  entries: 100_000,
  media: 100_000,
} as const;

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

async function* readEntries(file: File): AsyncGenerator<Entry> {
  const handle = file.open(FileMode.ReadOnly);
  const decoder = new TextDecoder();
  let text = "";
  let started = false;
  let finished = false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let item = "";

  const consume = function* (): Generator<Entry> {
    let index = 0;
    if (!started) {
      const match = /^\s*\{\s*"entries"\s*:\s*\[/.exec(text);
      if (!match) {
        if (text.length > 64) throw new Error("Invalid backup file: entries list is missing.");
        return;
      }
      started = true;
      index = match[0].length;
    }
    for (; index < text.length; index++) {
      const char = text[index];
      if (depth === 0) {
        if (/\s|,/.test(char)) continue;
        if (char === "]") {
          const suffix = text.slice(index + 1);
          if (!/^\s*}\s*$/.test(suffix)) throw new Error("Invalid backup file: malformed entries.");
          finished = true;
          text = "";
          return;
        }
        if (char !== "{") throw new Error("Invalid backup file: malformed entries.");
      }
      item += char;
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) {
          if (item.length > LIMITS.entryBytes)
            throw new Error("Invalid backup file: entry is too large.");
          yield JSON.parse(item) as Entry;
          item = "";
        }
      }
      if (item.length > LIMITS.entryBytes)
        throw new Error("Invalid backup file: entry is too large.");
    }
    text = item;
    item = "";
  };

  try {
    const size = handle.size ?? 0;
    let read = 0;
    while (read < size) {
      const chunk = handle.readBytes(Math.min(128 * 1024, size - read));
      if (chunk.length === 0) break;
      read += chunk.length;
      text += decoder.decode(chunk, { stream: read < size });
      yield* consume();
    }
    text += decoder.decode();
    yield* consume();
    if (!started || !finished || depth !== 0 || inString || text.length > 0) {
      throw new Error("Invalid backup file: malformed entries.");
    }
  } finally {
    handle.close();
  }
}

/** Restores a bounded, validated archive with a durable transaction record around the media/database handoff. */
export async function importBackupArchive(
  fileUri: string,
  options?: ImportBackupOptions
): Promise<ImportBackupResult> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Selected backup file does not exist.");
  const archiveBytes = sourceFile.info().size ?? 0;
  if (archiveBytes > LIMITS.archiveBytes) throw new Error("Backup file is too large to restore.");
  if (options?.signal?.aborted) throw new Error("Import cancelled");

  if (RESTORE_NEXT_MEDIA_DIR.exists) RESTORE_NEXT_MEDIA_DIR.delete();
  RESTORE_NEXT_MEDIA_DIR.create({ idempotent: true, intermediates: true });
  const dbTempFile = new File(Paths.cache, "restore-db.json");
  if (dbTempFile.exists) dbTempFile.delete();
  dbTempFile.create({ overwrite: true });
  const dbHandle = dbTempFile.open(FileMode.WriteOnly);
  let manifest: ArchiveManifest | null = null;
  let failure: Error | null = null;
  let totalUncompressed = 0;
  let mediaCount = 0;
  const paths = new Set<string>();

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
        member.name !== "db.json" &&
        !member.name.startsWith("media/")
      ) {
        failure = new Error("Invalid backup file: unexpected archive path.");
        return;
      }
      if (member.name.startsWith("media/")) {
        try {
          mediaFilename(member.name);
          mediaCount++;
          if (mediaCount > LIMITS.media)
            throw new Error("Invalid backup file: too many media files.");
        } catch (error) {
          failure = error instanceof Error ? error : new Error(String(error));
          return;
        }
      }
      const chunks: Uint8Array[] = [];
      let memberBytes = 0;
      let mediaHandle: ReturnType<File["open"]> | null = null;
      if (member.name.startsWith("media/")) {
        const destination = new File(RESTORE_NEXT_MEDIA_DIR, mediaFilename(member.name));
        destination.create({ overwrite: true });
        mediaHandle = destination.open(FileMode.WriteOnly);
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
          if (member.name === "db.json") dbHandle.writeBytes(chunk);
          else if (mediaHandle) mediaHandle.writeBytes(chunk);
          else {
            if (memberBytes > LIMITS.manifestBytes)
              throw new Error("Invalid backup manifest: too large.");
            chunks.push(chunk);
          }
          if (final) {
            mediaHandle?.close();
            if (member.name === "manifest.json") {
              manifest = JSON.parse(strFromU8(concat(chunks))) as ArchiveManifest;
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
    const handle = sourceFile.open(FileMode.ReadOnly);
    try {
      const size = handle.size ?? 0;
      let read = 0;
      while (read < size) {
        if (failure) throw failure;
        if (options?.signal?.aborted) throw new Error("Import cancelled");
        const chunk = handle.readBytes(Math.min(256 * 1024, size - read));
        if (chunk.length === 0) break;
        read += chunk.length;
        options?.onProgress?.(read, size);
        unzipper.push(chunk, read >= size);
      }
    } finally {
      handle.close();
    }
    if (failure) throw failure;
    if (!manifest || !paths.has("db.json"))
      throw new Error("Invalid backup file: manifest or entries missing.");
    const validatedManifest = manifest as ArchiveManifest;
    if ((dbTempFile.info().size ?? 0) > LIMITS.dbBytes)
      throw new Error("Invalid backup file: entries data is too large.");
    if (
      validatedManifest.counts.entry > LIMITS.entries ||
      validatedManifest.counts.images +
        validatedManifest.counts.audio +
        validatedManifest.counts.attachments >
        LIMITS.media
    ) {
      throw new Error("Invalid backup file: item count exceeds the restore limit.");
    }

    const transaction = await createRestoreTransaction();
    if (RESTORE_PREVIOUS_MEDIA_DIR.exists) RESTORE_PREVIOUS_MEDIA_DIR.delete();
    await updateRestoreTransaction(transaction, "swapping-media");
    if (RESTORE_MEDIA_DIR.exists) RESTORE_MEDIA_DIR.move(RESTORE_PREVIOUS_MEDIA_DIR);
    RESTORE_NEXT_MEDIA_DIR.move(RESTORE_MEDIA_DIR);
    await updateRestoreTransaction(transaction, "media-swapped");

    try {
      const importedCount = await importEntriesBatched(readEntries(dbTempFile), {
        signal: options?.signal,
        expectedCounts: validatedManifest.counts,
        restoreTransactionId: transaction.id,
      });
      await updateRestoreTransaction(transaction, "database-committed");
      if (RESTORE_PREVIOUS_MEDIA_DIR.exists) RESTORE_PREVIOUS_MEDIA_DIR.delete();
      clearRestoreTransaction();
      notifyStoreReload();
      return { importedCount };
    } catch (error) {
      if (RESTORE_MEDIA_DIR.exists) RESTORE_MEDIA_DIR.delete();
      if (transaction.hadPreviousMedia && RESTORE_PREVIOUS_MEDIA_DIR.exists) {
        RESTORE_PREVIOUS_MEDIA_DIR.move(RESTORE_MEDIA_DIR);
      } else {
        RESTORE_MEDIA_DIR.create({ idempotent: true, intermediates: true });
      }
      clearRestoreTransaction();
      throw error;
    }
  } finally {
    dbHandle.close();
    if (dbTempFile.exists) dbTempFile.delete();
    if (RESTORE_NEXT_MEDIA_DIR.exists) RESTORE_NEXT_MEDIA_DIR.delete();
  }
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
