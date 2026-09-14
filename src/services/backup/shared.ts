import type { ArchiveManifest } from "./types.ts";

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

/** Validates the small metadata record that accompanies an opaque SQLite/media archive. */
export function assertArchiveManifest(
  manifest: ArchiveManifest,
  archiveFormat: string,
  schemaVersion: number
): void {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Invalid backup manifest.");
  }
  const value = manifest as Partial<ArchiveManifest>;
  if (value.format !== archiveFormat) {
    throw new Error(`Invalid backup format: ${String(value.format)}`);
  }
  if (value.version !== schemaVersion) {
    throw new Error(
      typeof value.version === "number" && value.version > schemaVersion
        ? `Unsupported backup version (${value.version}). Please update OpenLog.`
        : `Invalid backup file: unsupported archive version (${String(value.version)}).`
    );
  }
  if (!Number.isFinite(value.createdAt)) {
    throw new Error("Invalid backup manifest: createdAt is missing.");
  }
  if (typeof value.appVersion !== "string" || !value.appVersion) {
    throw new Error("Invalid backup manifest: appVersion is missing.");
  }
  if (!value.counts || typeof value.counts !== "object") {
    throw new Error("Invalid backup manifest: counts is missing.");
  }
  const { entry, media } = value.counts as unknown as Record<string, unknown>;
  if (!isNonNegativeInteger(entry) || !isNonNegativeInteger(media)) {
    throw new Error("Invalid backup manifest: counts must be non-negative integers.");
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
