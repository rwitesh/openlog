import {
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  type BackupManifest,
  type BackupTimelineData,
  MANIFEST_FILENAME,
  TIMELINE_DATA_FILENAME,
} from "./types.ts";

/** Rejects backups whose entries refer to media that was not actually archived. */
export function assertBackupMediaReferences(
  entries: BackupTimelineData["entries"],
  mediaNames: ReadonlySet<string>
): void {
  for (const entry of entries) {
    const references = [
      ...(entry.images ?? []),
      ...(entry.audios ?? []),
      ...(entry.attachments?.map((attachment) => attachment.uri) ?? []),
    ];
    for (const filename of references) {
      if (!mediaNames.has(filename)) {
        throw new Error(`Invalid backup file: media file ${filename} is missing.`);
      }
    }
  }
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** A restorable media reference: a non-empty bare filename with no path or traversal. */
function isBareFilename(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.includes("/") &&
    !value.includes("\\") &&
    value !== "." &&
    value !== ".."
  );
}

/** Validates the backup manifest metadata. */
export function assertBackupManifest(data: unknown): asserts data is BackupManifest {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid backup manifest: not an object.");
  }
  const obj = data as Record<string, unknown>;
  if (obj.format !== ARCHIVE_FORMAT) {
    throw new Error(`Invalid backup format: ${String(obj.format)}`);
  }
  if (typeof obj.version !== "number" || !Number.isInteger(obj.version) || obj.version < 1) {
    throw new Error(`Invalid backup file: unsupported archive version (${String(obj.version)}).`);
  }
  if (obj.version > ARCHIVE_SCHEMA_VERSION) {
    throw new Error(`Unsupported backup version (${obj.version}). Please update OpenLog.`);
  }
  if (typeof obj.createdAt !== "number" || !Number.isFinite(obj.createdAt)) {
    throw new Error("Invalid backup manifest: createdAt is missing or invalid.");
  }
  if (typeof obj.appVersion !== "string" || !obj.appVersion) {
    throw new Error("Invalid backup manifest: appVersion is missing.");
  }
  if (!obj.counts || typeof obj.counts !== "object") {
    throw new Error("Invalid backup manifest: counts is missing.");
  }
  const counts = obj.counts as Record<string, unknown>;
  if (
    !isNonNegativeInteger(counts.entry) ||
    !isNonNegativeInteger(counts.tag) ||
    !isNonNegativeInteger(counts.media)
  ) {
    throw new Error("Invalid backup manifest: counts must be non-negative integers.");
  }
}

/** Validates the structured JSON timeline archive data. */
export function assertBackupTimelineData(data: unknown): asserts data is BackupTimelineData {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid backup timeline: not an object.");
  }
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.tags)) {
    throw new Error("Invalid backup timeline: tags must be an array.");
  }
  for (const tag of obj.tags) {
    if (!tag || typeof tag !== "object") {
      throw new Error("Invalid backup tag: malformed item.");
    }
    const t = tag as Record<string, unknown>;
    if (typeof t.id !== "string" || !t.id) throw new Error("Invalid backup tag: missing id.");
    if (typeof t.name !== "string" || !t.name) throw new Error("Invalid backup tag: missing name.");
    if (typeof t.key !== "string") throw new Error("Invalid backup tag: key is required.");
    if (typeof t.colorId !== "string" || !t.colorId)
      throw new Error("Invalid backup tag: missing colorId.");
    if (typeof t.createdAt !== "number" || !Number.isFinite(t.createdAt)) {
      throw new Error("Invalid backup tag: createdAt is required.");
    }
    if (typeof t.updatedAt !== "number" || !Number.isFinite(t.updatedAt)) {
      throw new Error("Invalid backup tag: updatedAt is required.");
    }
  }

  if (!Array.isArray(obj.entries)) {
    throw new Error("Invalid backup timeline: entries must be an array.");
  }
  for (const entry of obj.entries) {
    if (!entry || typeof entry !== "object") {
      throw new Error("Invalid backup entry: malformed item.");
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || !e.id) throw new Error("Invalid backup entry: missing id.");
    if (typeof e.createdAt !== "number" || !Number.isFinite(e.createdAt)) {
      throw new Error("Invalid backup entry: createdAt is required.");
    }
    if (typeof e.updatedAt !== "number" || !Number.isFinite(e.updatedAt)) {
      throw new Error("Invalid backup entry: updatedAt is required.");
    }
    if (e.text !== undefined && e.text !== null && typeof e.text !== "string") {
      throw new Error("Invalid backup entry: text must be a string or null.");
    }
    if (e.images !== undefined && (!Array.isArray(e.images) || !e.images.every(isBareFilename))) {
      throw new Error("Invalid backup entry: images must be media filenames.");
    }
    if (e.audios !== undefined && (!Array.isArray(e.audios) || !e.audios.every(isBareFilename))) {
      throw new Error("Invalid backup entry: audios must be media filenames.");
    }
    if (e.attachments !== undefined) {
      if (!Array.isArray(e.attachments)) {
        throw new Error("Invalid backup entry: attachments must be an array.");
      }
      for (const attachment of e.attachments) {
        if (!attachment || typeof attachment !== "object" || !isBareFilename(attachment.uri)) {
          throw new Error("Invalid backup entry: attachment uris must be media filenames.");
        }
      }
    }
    if (e.tagIds !== undefined && !Array.isArray(e.tagIds)) {
      throw new Error("Invalid backup entry: tagIds must be an array.");
    }
    if (e.location !== undefined && e.location !== null) {
      if (typeof e.location !== "object") {
        throw new Error("Invalid backup entry: location must be an object or null.");
      }
      const loc = e.location as Record<string, unknown>;
      if (typeof loc.latitude !== "number" || typeof loc.longitude !== "number") {
        throw new Error("Invalid backup entry: location coordinates must be numbers.");
      }
    }
  }

  if (obj.settings !== undefined && (typeof obj.settings !== "object" || obj.settings === null)) {
    throw new Error("Invalid backup timeline: settings must be an object.");
  }
  if (
    obj.preferences !== undefined &&
    (typeof obj.preferences !== "object" || obj.preferences === null)
  ) {
    throw new Error("Invalid backup timeline: preferences must be an object.");
  }
}

export const DATABASE_SIZE_CEILING = 256 * 1024 * 1024;

export const BACKUP_LIMITS = {
  archiveBytes: 512 * 1024 * 1024,
  uncompressedBytes: 2 * 1024 * 1024 * 1024,
  memberBytes: 256 * 1024 * 1024,
  timelineDataBytes: 64 * 1024 * 1024,
  manifestBytes: 64 * 1024 * 1024,
  media: 100_000,
} as const;

export const RESTORE_SAFETY_BUFFER_BYTES = 50 * 1024 * 1024;

export interface ExportSizeLimitsInput {
  manifestBytes: number;
  timelineBytes: number;
  mediaBytes: readonly number[];
}

/** Keeps successful exports within the limits enforced by restore. */
export function assertBackupExportSizeLimits({
  manifestBytes,
  timelineBytes,
  mediaBytes,
}: ExportSizeLimitsInput): void {
  if (manifestBytes > BACKUP_LIMITS.manifestBytes) {
    throw new Error("Backup manifest is too large to restore.");
  }
  if (timelineBytes > BACKUP_LIMITS.timelineDataBytes) {
    throw new Error("Backup data is too large to restore.");
  }
  if (mediaBytes.length > BACKUP_LIMITS.media) {
    throw new Error("Backup contains too many media files to restore.");
  }
  const total = manifestBytes + timelineBytes + mediaBytes.reduce((sum, bytes) => sum + bytes, 0);
  if (total > BACKUP_LIMITS.uncompressedBytes) {
    throw new Error("Backup expands beyond the restore limit.");
  }
  if (mediaBytes.some((bytes) => bytes > BACKUP_LIMITS.memberBytes)) {
    throw new Error("A media file is too large to include in a restorable backup.");
  }
}

export function assertBackupArchiveSize(bytes: number): void {
  if (bytes > BACKUP_LIMITS.archiveBytes) {
    throw new Error("Backup is too large to restore.");
  }
}

export interface StoragePreflightParams {
  archiveBytes: number;
  existingTimelineBytes: number;
  uncompressedBytes?: number;
  expectedArchiveBytes?: number;
  safetyBufferBytes?: number;
}

/**
 * Calculates the required free disk storage before beginning a restore.
 * Uses exact uncompressedBytes when the archive size matches expectedArchiveBytes;
 * otherwise conservatively reserves the full allowed expansion capacity up to BACKUP_LIMITS.uncompressedBytes.
 */
export function calculateRequiredRestoreBytes({
  archiveBytes,
  existingTimelineBytes,
  uncompressedBytes,
  expectedArchiveBytes,
  safetyBufferBytes = RESTORE_SAFETY_BUFFER_BYTES,
}: StoragePreflightParams): number {
  const isSizeUnchanged =
    expectedArchiveBytes !== undefined && expectedArchiveBytes === archiveBytes;
  const estimatedStagingBytes =
    uncompressedBytes !== undefined && uncompressedBytes > 0 && isSizeUnchanged
      ? Math.min(uncompressedBytes, BACKUP_LIMITS.uncompressedBytes)
      : Math.min(Math.max(archiveBytes * 4, 10 * 1024 * 1024), BACKUP_LIMITS.uncompressedBytes);

  return archiveBytes + estimatedStagingBytes + existingTimelineBytes + safetyBufferBytes;
}

/**
 * Validates that an archive path adheres to the expected format:
 * - "timeline.json"
 * - "media/<filename>" (non-empty, single segment, no traversal or backslashes)
 * Enforces no path traversal, duplicate path rejection, and unexpected path rejection.
 */
export function validateArchivePath(name: string, seenPaths?: Set<string>): void {
  if (name.startsWith("/") || name.startsWith("\\") || name.includes("..") || name.includes("\\")) {
    throw new Error("Invalid backup file: unexpected archive path.");
  }
  if (seenPaths?.has(name)) {
    if (name === MANIFEST_FILENAME) {
      throw new Error("Invalid backup file: duplicate manifest.");
    }
    if (name === TIMELINE_DATA_FILENAME) {
      throw new Error("Invalid backup file: duplicate timeline data.");
    }
    throw new Error("Invalid backup file: duplicate archive path.");
  }
  if (name === MANIFEST_FILENAME || name === TIMELINE_DATA_FILENAME) {
    return;
  }
  if (name.startsWith("media/")) {
    const filename = name.slice("media/".length);
    if (
      filename.length === 0 ||
      filename.includes("/") ||
      filename === "." ||
      filename === ".." ||
      filename.includes("\\")
    ) {
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

let activeRestoreGatePromise: Promise<void> | null = null;
let resolveRestoreGate: (() => void) | null = null;

export function acquireRestoreGate(): void {
  if (resolveRestoreGate) throw new Error("A restore is already in progress.");
  activeRestoreGatePromise = new Promise<void>((resolve) => {
    resolveRestoreGate = resolve;
  });
}

export function releaseRestoreGate(): void {
  resolveRestoreGate?.();
  resolveRestoreGate = null;
  activeRestoreGatePromise = null;
}

export async function waitForRestoreGate(): Promise<void> {
  if (activeRestoreGatePromise) await activeRestoreGatePromise;
}
