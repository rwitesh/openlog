import { APP_SLUG } from "@/shared/constants";
import type { Entry } from "@/shared/types";

export const ARCHIVE_FORMAT = `${APP_SLUG}-archive` as const;
export const ARCHIVE_SCHEMA_VERSION = 1;
export const ARCHIVE_EXTENSION = `.${APP_SLUG}`;

export interface ArchivePreviewEntry {
  id: string;
  createdAt: number;
  textSnippet: string;
  hasImages: boolean;
  hasAudios: boolean;
  hasAttachments: boolean;
}

export interface ArchiveCounts {
  entry: number;
  images: number;
  audio: number;
  attachments: number;
}

export interface ArchiveManifest {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  createdAt: number;
  appVersion: string;
  counts: ArchiveCounts;
  previewEntries: ArchivePreviewEntry[];
}

export interface ArchiveDb {
  entries: Entry[];
}

export interface InspectBackupResult {
  format: string;
  version: number;
  createdAt: number;
  appVersion: string;
  counts: ArchiveCounts;
  previewEntries: ArchivePreviewEntry[];
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

export type ExportBackupPhase = "entries" | "media";

export interface ExportBackupOptions {
  signal?: AbortSignal;
  onProgress?: (processed: number, total: number, phase: ExportBackupPhase) => void;
}

export interface ImportBackupOptions {
  signal?: AbortSignal;
  onProgress?: (processedBytes: number, totalBytes: number) => void;
}
