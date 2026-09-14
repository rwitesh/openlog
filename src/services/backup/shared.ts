import type { ArchiveManifest } from "./types.ts";

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
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
