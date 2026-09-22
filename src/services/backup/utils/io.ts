import { getDocumentAsync } from "expo-document-picker";
import { Directory, File } from "expo-file-system";

import { logDevWarning } from "@/shared/utils/devLog";

import { ARCHIVE_EXTENSION } from "./types";

/**
 * Prompts user with the system file picker to select a backup archive.
 */
export async function pickBackupArchiveFile(): Promise<string | null> {
  const result = await getDocumentAsync({
    type: ["*/*", "application/octet-stream", "application/zip"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const asset = result.assets[0];
  const name = (asset.name || asset.uri).toLowerCase();
  if (!name.endsWith(ARCHIVE_EXTENSION) && !name.endsWith(`${ARCHIVE_EXTENSION}.zip`)) {
    throw new Error(`Please select a valid ${ARCHIVE_EXTENSION} backup file.`);
  }

  return asset.uri;
}

/**
 * Prompts user to pick a folder upfront for backup storage.
 * Returns null if cancelled. Throws error if unsupported or picker fails.
 */
export async function pickBackupDestinationDirectory(): Promise<Directory | null> {
  try {
    const targetDir = await Directory.pickDirectoryAsync();
    if (!targetDir?.uri) return null;
    return targetDir;
  } catch (pickerErr) {
    if (
      pickerErr instanceof Error &&
      (/cancel/i.test(pickerErr.message) || /cancel/i.test(pickerErr.name))
    ) {
      return null;
    }
    throw pickerErr;
  }
}

/**
 * Copies a completed backup archive to a destination directory using native streaming,
 * then removes the temporary archive from cache.
 */
export async function copyBackupToDirectory(
  fileUri: string,
  filename: string,
  targetDir: Directory
): Promise<void> {
  const sourceFile = new File(fileUri);
  if (!sourceFile.exists) throw new Error("Backup file could not be found.");
  if (sourceFile.name !== filename) sourceFile.rename(filename);
  await sourceFile.copy(targetDir, { overwrite: true });
  try {
    sourceFile.delete();
  } catch (err) {
    logDevWarning("copyBackupToDirectory:deleteSource", err);
  }
}
