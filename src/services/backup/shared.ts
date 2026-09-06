import { File } from "expo-file-system";

import { resolveMediaUri } from "@/services/media/storage";
import type { Attachment, Entry } from "@/shared/types";

import type { ArchiveManifest, ArchivePreviewEntry } from "./types";
import { ARCHIVE_FORMAT, ARCHIVE_SCHEMA_VERSION } from "./types";

export function formatDateForFilename(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

export interface MediaItem {
  path: string;
  localUri: string;
}

export interface NormalizeMediaResult {
  paths: string[];
  skipped: number;
}

/**
 * Normalizes media paths to `media/<filename>`, collecting existing local files for export.
 * Omits missing or inaccessible files and counts them as skipped.
 */
export function normalizeMediaUris(
  uris: (string | undefined)[],
  mediaList: MediaItem[]
): NormalizeMediaResult {
  const paths: string[] = [];
  let skipped = 0;

  for (const uri of uris) {
    if (!uri) continue;
    const resolved = resolveMediaUri(uri);
    try {
      const file = new File(resolved);
      if (file.exists) {
        const path = `media/${file.name}`;
        paths.push(path);
        const existing = mediaList.find((item) => item.path === path);
        if (!existing) {
          mediaList.push({ path, localUri: resolved });
        }
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return { paths, skipped };
}

export function normalizeAttachments(
  attachments: Attachment[] | undefined,
  mediaList: MediaItem[]
): { attachments: Attachment[]; skipped: number } {
  if (!attachments || attachments.length === 0) {
    return { attachments: [], skipped: 0 };
  }

  let skipped = 0;
  const normalized = attachments.flatMap((attachment) => {
    const { paths, skipped: omitted } = normalizeMediaUris([attachment.uri], mediaList);
    skipped += omitted;
    const uri = paths[0];
    return uri ? [{ ...attachment, uri }] : [];
  });

  return { attachments: normalized, skipped };
}

export function entryToPreview(entry: Entry): ArchivePreviewEntry {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    textSnippet: entry.text ? entry.text.slice(0, 100).trim() : "(No text)",
    hasImages: Boolean(entry.images?.length),
    hasAudios: Boolean(entry.audios?.length),
    hasAttachments: Boolean(entry.attachments?.length),
  };
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Validates manifest shape, format, schema version, and count fields. */
export function assertArchiveManifest(manifest: ArchiveManifest): void {
  if (manifest.format !== ARCHIVE_FORMAT) {
    throw new Error(`Invalid backup format: ${String(manifest.format)}`);
  }
  if (manifest.version !== ARCHIVE_SCHEMA_VERSION) {
    throw new Error(
      manifest.version > ARCHIVE_SCHEMA_VERSION
        ? `Unsupported backup version (${manifest.version}). Please update OpenLog.`
        : `Invalid backup file: unsupported archive version (${manifest.version}).`
    );
  }
  if (!Number.isFinite(manifest.createdAt)) {
    throw new Error("Invalid backup manifest: createdAt is missing.");
  }
  if (!manifest.counts || typeof manifest.counts !== "object") {
    throw new Error("Invalid backup manifest: counts is missing.");
  }
  const { entry, images, audio, attachments } = manifest.counts;
  if (
    !isNonNegativeInteger(entry) ||
    !isNonNegativeInteger(images) ||
    !isNonNegativeInteger(audio) ||
    !isNonNegativeInteger(attachments)
  ) {
    throw new Error("Invalid backup manifest: counts must be non-negative integers.");
  }
  if (!Array.isArray(manifest.previewEntries)) {
    throw new Error("Invalid backup manifest: previewEntries must be an array.");
  }
}

export function parseArchiveManifest(json: string): ArchiveManifest {
  const manifest = JSON.parse(json) as ArchiveManifest;
  assertArchiveManifest(manifest);
  return manifest;
}

/** Ensures db.json entry rows match manifest counts before restore commits. */
export function assertManifestMatchesEntries(manifest: ArchiveManifest, entries: Entry[]): void {
  const { entry, images, audio, attachments } = manifest.counts;

  if (entries.length !== entry) {
    throw new Error(
      `Backup data mismatch: manifest lists ${entry} entries but archive contains ${entries.length}.`
    );
  }

  let imagesTotal = 0;
  let audioTotal = 0;
  let attachmentsTotal = 0;
  for (const row of entries) {
    imagesTotal += row.images?.length ?? 0;
    audioTotal += row.audios?.length ?? 0;
    attachmentsTotal += row.attachments?.length ?? 0;
  }

  if (imagesTotal !== images) {
    throw new Error(
      `Backup data mismatch: manifest lists ${images} images but archive contains ${imagesTotal}.`
    );
  }
  if (audioTotal !== audio) {
    throw new Error(
      `Backup data mismatch: manifest lists ${audio} audio files but archive contains ${audioTotal}.`
    );
  }
  if (attachmentsTotal !== attachments) {
    throw new Error(
      `Backup data mismatch: manifest lists ${attachments} attachments but archive contains ${attachmentsTotal}.`
    );
  }
}
