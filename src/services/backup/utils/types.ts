export const ARCHIVE_FORMAT = "openlog-backup" as const;
export const ARCHIVE_SCHEMA_VERSION = 1;
export const ARCHIVE_EXTENSION = ".openlog";
export const MANIFEST_FILENAME = "manifest.json" as const;
export const TIMELINE_DATA_FILENAME = "timeline.json" as const;

export interface BackupArchiveCounts {
  entry: number;
  tag: number;
  media: number;
}

export type ArchiveCounts = {
  entry: number;
  tag?: number;
  media: number;
};

export interface BackupManifest {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  createdAt: number;
  appVersion: string;
  counts: BackupArchiveCounts;
}

export interface BackupTag {
  id: string;
  name: string;
  key: string;
  colorId: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupAttachment {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface BackupLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface BackupEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  text?: string | null;
  images?: string[];
  audios?: string[];
  attachments?: BackupAttachment[];
  tagIds?: string[];
  location?: BackupLocation | null;
}

export interface BackupTimelineData {
  tags: BackupTag[];
  entries: BackupEntry[];
  preferences?: Record<string, unknown>;
  settings?: Record<string, string>;
}

export interface InspectBackupResult {
  format: string;
  version: number;
  createdAt: number;
  appVersion: string;
  counts: { entry: number; tag?: number; media: number };
  uncompressedBytes?: number;
  archiveBytes?: number;
}

export interface InspectBackupOptions {
  signal?: AbortSignal;
}

export interface ExportBackupResult {
  fileUri: string;
  filename: string;
  counts: { entry: number; tag: number; media: number };
  byteSize: number;
}

export type ExportBackupPhase = "entries" | "media";

export interface ExportBackupOptions {
  signal?: AbortSignal;
  onProgress?: (processed: number, total: number, phase: ExportBackupPhase) => void;
}

export interface ImportBackupResult {
  importedCount: number;
}

export interface ImportBackupOptions {
  signal?: AbortSignal;
  onProgress?: (processedBytes: number, totalBytes: number) => void;
  counts?: { entry: number; tag?: number; media: number };
  uncompressedBytes?: number;
  expectedArchiveBytes?: number;
}
