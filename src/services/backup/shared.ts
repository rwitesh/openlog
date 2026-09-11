import type { Entry } from "@/shared/types";

import type { ArchiveManifest } from "./types.ts";

interface BackupEntryData {
  images?: unknown[];
  audios?: unknown[];
  attachments?: unknown[];
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

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

/** Validates manifest shape, format, schema version, and count fields. */
export function assertArchiveManifest(
  manifest: ArchiveManifest,
  archiveFormat: string,
  schemaVersion: number
): void {
  if (manifest.format !== archiveFormat) {
    throw new Error(`Invalid backup format: ${String(manifest.format)}`);
  }
  if (manifest.version !== schemaVersion) {
    throw new Error(
      typeof manifest.version === "number" && manifest.version > schemaVersion
        ? `Unsupported backup version (${manifest.version}). Please update OpenLog.`
        : `Invalid backup file: unsupported archive version (${String(manifest.version)}).`
    );
  }
  if (!Number.isFinite(manifest.createdAt)) {
    throw new Error("Invalid backup manifest: createdAt is missing.");
  }
  if (!manifest.counts || typeof manifest.counts !== "object") {
    throw new Error("Invalid backup manifest: counts is missing.");
  }
  const { entry, images, audio, attachments } = manifest.counts as unknown as Record<
    string,
    unknown
  >;
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

export function parseArchiveManifest(
  json: string,
  archiveFormat: string,
  schemaVersion: number
): ArchiveManifest {
  const manifest = JSON.parse(json) as ArchiveManifest;
  assertArchiveManifest(manifest, archiveFormat, schemaVersion);
  return manifest;
}

/** Ensures db.json entry rows match manifest counts before restore commits. */
export function assertManifestMatchesEntries(manifest: ArchiveManifest, entries: Entry[]): void {
  assertEntryCounts(manifest.counts, entries);
}

export function assertEntryCounts(
  counts: { entry: number; images: number; audio: number; attachments: number },
  entries: BackupEntryData[]
): void {
  if (entries.length !== counts.entry) {
    throw new Error(
      `Backup data mismatch: manifest lists ${counts.entry} entries but archive contains ${entries.length}.`
    );
  }

  const actual = entries.reduce(
    (totals, entry) => ({
      images: totals.images + (entry.images?.length ?? 0),
      audio: totals.audio + (entry.audios?.length ?? 0),
      attachments: totals.attachments + (entry.attachments?.length ?? 0),
    }),
    { images: 0, audio: 0, attachments: 0 }
  );

  if (actual.images !== counts.images) {
    throw new Error(
      `Backup data mismatch: manifest lists ${counts.images} images but archive contains ${actual.images}.`
    );
  }
  if (actual.audio !== counts.audio) {
    throw new Error(
      `Backup data mismatch: manifest lists ${counts.audio} audio files but archive contains ${actual.audio}.`
    );
  }
  if (actual.attachments !== counts.attachments) {
    throw new Error(
      `Backup data mismatch: manifest lists ${counts.attachments} attachments but archive contains ${actual.attachments}.`
    );
  }
}
