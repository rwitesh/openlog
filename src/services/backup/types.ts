import { APP_SLUG } from "@/shared/constants";
export const ARCHIVE_FORMAT = `${APP_SLUG}-archive` as const;
export const ARCHIVE_SCHEMA_VERSION = 1;
export const ARCHIVE_EXTENSION = `.${APP_SLUG}`;

export interface ArchiveCounts {
  entry: number;
  media: number;
}

export interface ArchiveManifest {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  createdAt: number;
  appVersion: string;
  counts: ArchiveCounts;
}

export interface InspectBackupResult {
  format: string;
  version: number;
  createdAt: number;
  appVersion: string;
  counts: ArchiveCounts;
  uncompressedBytes?: number;
}

export interface InspectBackupOptions {
  signal?: AbortSignal;
}

export interface ExportBackupResult {
  fileUri: string;
  filename: string;
  counts: ArchiveCounts;
  byteSize: number;
}

export interface ImportBackupResult {
  importedCount: number;
}

export type ExportBackupPhase = "database" | "media";

export interface ExportBackupOptions {
  signal?: AbortSignal;
  onProgress?: (processed: number, total: number, phase: ExportBackupPhase) => void;
}

export interface ImportBackupOptions {
  signal?: AbortSignal;
  onProgress?: (processedBytes: number, totalBytes: number) => void;
  counts?: ArchiveCounts;
  uncompressedBytes?: number;
}
