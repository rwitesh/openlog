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

export const DATABASE_SIZE_CEILING = 256 * 1024 * 1024;

export const BACKUP_LIMITS = {
  archiveBytes: 512 * 1024 * 1024,
  uncompressedBytes: 2 * 1024 * 1024 * 1024,
  memberBytes: 256 * 1024 * 1024,
  manifestBytes: 256 * 1024,
  media: 100_000,
} as const;

export const LIMITS = BACKUP_LIMITS;

/**
 * Validates that an archive path adheres to the expected format:
 * - "manifest.json"
 * - "database.sqlite"
 * - "media/<filename>" (non-empty, single segment, no traversal or backslashes)
 * Enforces no path traversal, duplicate path rejection, and unexpected path rejection.
 */
export function validateArchivePath(name: string, seenPaths?: Set<string>): void {
  if (name.startsWith("/") || name.startsWith("\\") || name.includes("..") || name.includes("\\")) {
    throw new Error("Invalid backup file: unexpected archive path.");
  }
  if (seenPaths?.has(name)) {
    if (name === "manifest.json") {
      throw new Error("Invalid backup file: duplicate manifest.");
    }
    throw new Error("Invalid backup file: duplicate archive path.");
  }
  if (name === "manifest.json" || name === "database.sqlite") {
    return;
  }
  if (name.startsWith("media/")) {
    const filename = name.slice("media/".length);
    if (filename.length === 0 || filename.includes("/") || filename === "." || filename === "..") {
      throw new Error("Invalid backup file: unexpected archive path.");
    }
    return;
  }
  throw new Error("Invalid backup file: unexpected archive path.");
}

export function extractMediaFilename(path: string): string {
  validateArchivePath(path);
  if (!path.startsWith("media/")) {
    throw new Error("Invalid media path in backup archive.");
  }
  return path.slice("media/".length);
}

let activeGatePromise: Promise<void> | null = null;
let resolveActiveGate: (() => void) | null = null;

export function acquireExportGate(): void {
  if (resolveActiveGate) {
    resolveActiveGate();
  }
  activeGatePromise = new Promise<void>((resolve) => {
    resolveActiveGate = resolve;
  });
}

export function releaseExportGate(): void {
  if (resolveActiveGate) {
    resolveActiveGate();
    resolveActiveGate = null;
  }
  activeGatePromise = null;
}

export async function waitForExportGate(): Promise<void> {
  if (activeGatePromise) {
    await activeGatePromise;
  }
}

export function isExportGateActive(): boolean {
  return activeGatePromise !== null;
}
