import { useSyncExternalStore } from "react";

export interface BackupStatus {
  isExporting: boolean;
  isImporting: boolean;
}

let activeExportController: AbortController | null = null;
let activeImportController: AbortController | null = null;
const backupStatusListeners = new Set<() => void>();
let cachedStatus: BackupStatus = { isExporting: false, isImporting: false };

function notifyBackupStatusChange() {
  for (const listener of backupStatusListeners) {
    listener();
  }
}

export function getBackupStatus(): BackupStatus {
  const isExporting = activeExportController !== null;
  const isImporting = activeImportController !== null;
  if (cachedStatus.isExporting !== isExporting || cachedStatus.isImporting !== isImporting) {
    cachedStatus = { isExporting, isImporting };
  }
  return cachedStatus;
}

export function subscribeBackupStatus(listener: () => void): () => void {
  backupStatusListeners.add(listener);
  return () => {
    backupStatusListeners.delete(listener);
  };
}

/**
 * Hook to reactively observe if a backup export or import operation is in flight.
 */
export function useBackupStatus(): BackupStatus {
  return useSyncExternalStore(subscribeBackupStatus, getBackupStatus);
}

export function setExportController(controller: AbortController | null): void {
  activeExportController = controller;
  notifyBackupStatusChange();
}

export function setImportController(controller: AbortController | null): void {
  activeImportController = controller;
  notifyBackupStatusChange();
}

export function cancelActiveBackup(): boolean {
  if (activeExportController) {
    activeExportController.abort();
    activeExportController = null;
    notifyBackupStatusChange();
    return true;
  }
  return false;
}

export function cancelActiveImport(): boolean {
  if (activeImportController) {
    activeImportController.abort();
    activeImportController = null;
    notifyBackupStatusChange();
    return true;
  }
  return false;
}
