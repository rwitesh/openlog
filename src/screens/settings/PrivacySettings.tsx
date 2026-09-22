import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, View } from "react-native";

import { analytics } from "@/config/analytics";
import { useEntries } from "@/modules/entry";
import {
  confirmDestructive,
  SettingsGroup,
  SettingsRow,
  SettingsScreenScroll,
} from "@/modules/settings";
import {
  authenticate,
  type BiometricSupport,
  getBiometricSupport,
  useBiometricLock,
} from "@/services/auth";
import {
  type ArchiveCounts,
  cancelActiveBackup,
  cancelActiveRestore,
  copyBackupToDirectory,
  exportBackupArchive,
  hasLocalContentForRestore,
  type InspectBackupResult,
  importBackupArchive,
  inspectBackupArchive,
  pickBackupArchiveFile,
  pickBackupDestinationDirectory,
  setExportController,
  setImportController,
  useBackupStatus,
} from "@/services/backup";
import { deleteMediaFiles } from "@/services/media";
import {
  dismissBackupProgressNotification,
  notifyBackupError,
  notifyBackupExportComplete,
  notifyBackupImportComplete,
  notifyBackupProgress,
} from "@/services/notifications";
import { ThemedText } from "@/shared/components/ThemedText";
import { logDevWarning } from "@/shared/utils";
import { press, space, typography, useTheme } from "@/theme";

const RESTORE_FAILURE_MESSAGE =
  "Restore couldn’t complete. Check the backup file and available storage, then try again.";

/**
 * Privacy & data category screen — everything about trust: the biometric
 * app lock under SECURITY, backup/export under BACKUP & EXPORT,
 * and storage management under STORAGE.
 */
export function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { enabled, setEnabled } = useBiometricLock();
  const { clearAll } = useEntries();
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [verifying, setVerifying] = useState(false);
  const { isExporting, isImporting } = useBackupStatus();

  useEffect(() => {
    let active = true;

    getBiometricSupport().then((result) => {
      if (active) setSupport(result);
    });

    return () => {
      active = false;
    };
  }, []);

  const caption = (() => {
    if (!support) return "Checking device support";
    if (!support.hasHardware) return "Not supported on this device.";
    if (!support.isEnrolled) return "Set up biometrics in device settings.";
    return "Require Face ID or fingerprint to open the app.";
  })();

  const handleToggle = async (value: boolean) => {
    if (!value) {
      setEnabled(false);
      analytics.capture("biometric_lock_disabled");
      return;
    }

    if (!support?.available || verifying) return;

    // Confirm with a live scan before arming the lock.
    setVerifying(true);
    const confirmed = await authenticate("Enable biometric unlock");
    setVerifying(false);

    if (confirmed) {
      setEnabled(true);
      analytics.capture("biometric_lock_enabled");
    }
  };

  const handleExport = async () => {
    if (isExporting || isImporting) return;

    // 1. Pick destination folder FIRST
    let targetDir = null;
    let useShareFallback = false;
    try {
      targetDir = await pickBackupDestinationDirectory();
      if (!targetDir) return; // User cancelled
    } catch (err) {
      logDevWarning("settings:pickExportDir", err);
      useShareFallback = true;
    }

    const controller = new AbortController();
    setExportController(controller);

    void notifyBackupProgress("Saving backup", "Preparing your backup");

    try {
      const result = await exportBackupArchive({
        signal: controller.signal,
        onProgress: (processed, total, phase) => {
          const isEntriesPhase = phase === "entries";
          const step = isEntriesPhase ? 1 : 10;
          if (processed % step !== 0 && processed !== total) return;
          const body = isEntriesPhase
            ? "Saving your entries"
            : `Saving files (${processed.toLocaleString()} of ${total.toLocaleString()})`;
          void notifyBackupProgress("Saving backup", body);
        },
      });

      if (controller.signal.aborted) return;

      if (targetDir) {
        try {
          await copyBackupToDirectory(result.fileUri, result.filename, targetDir);
        } catch (copyErr) {
          logDevWarning("settings:copyBackupToDir", copyErr);
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(result.fileUri, {
              mimeType: "application/octet-stream",
              UTI: "public.archive",
            });
            try {
              new File(result.fileUri).delete();
            } catch {
              // ignore
            }
          } else {
            throw copyErr;
          }
        }
      } else if (useShareFallback) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(result.fileUri, {
            mimeType: "application/octet-stream",
            UTI: "public.archive",
          });
          try {
            new File(result.fileUri).delete();
          } catch {
            // ignore
          }
        } else {
          throw new Error("No storage destination available on this device.");
        }
      }

      const entryCount = result.counts.entry;
      analytics.capture("backup_exported", {
        entry_count: entryCount,
        byte_size: result.byteSize,
      });

      void notifyBackupExportComplete(entryCount, result.byteSize);

      Alert.alert(
        "Backup saved",
        `${entryCount.toLocaleString()} ${entryCount === 1 ? "entry" : "entries"} saved.`,
        [{ text: "Done" }]
      );
    } catch (error) {
      if (controller.signal.aborted) {
        void dismissBackupProgressNotification();
        return;
      }
      logDevWarning("settings:exportBackup", error);
      analytics.capture("backup_export_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      const message = "Couldn’t save your backup. Check your storage and try again.";
      void notifyBackupError("Backup failed", message);
      Alert.alert("Backup failed", message);
    } finally {
      setExportController(null);
    }
  };

  const handleCancelExport = () => {
    cancelActiveBackup();
    void dismissBackupProgressNotification();
  };

  const executeImport = async (
    fileUri: string,
    counts?: ArchiveCounts,
    uncompressedBytes?: number,
    expectedArchiveBytes?: number
  ) => {
    const controller = new AbortController();
    setImportController(controller);

    void notifyBackupProgress("Restoring backup", "Extracting files...");

    try {
      const result = await importBackupArchive(fileUri, {
        signal: controller.signal,
        counts,
        uncompressedBytes,
        expectedArchiveBytes,
      });

      const importedCount = result?.importedCount ?? counts?.entry ?? 0;
      let byteSize = expectedArchiveBytes;
      if (byteSize === undefined) {
        try {
          const temp = new File(fileUri);
          if (temp.exists) byteSize = temp.size;
        } catch {
          // ignore
        }
      }

      analytics.capture("backup_imported", {
        entry_count: importedCount,
        byte_size: byteSize ?? null,
      });

      void dismissBackupProgressNotification();
      void notifyBackupImportComplete(importedCount);

      Alert.alert(
        "Restore complete",
        `${importedCount.toLocaleString()} ${importedCount === 1 ? "entry" : "entries"} restored.`,
        [{ text: "Done" }]
      );
    } catch (error) {
      if (controller.signal.aborted) {
        analytics.capture("backup_import_cancelled", {
          byte_size: expectedArchiveBytes ?? null,
        });
        void dismissBackupProgressNotification();
        Alert.alert("Restore cancelled", "Restore did not complete.");
        return;
      }
      logDevWarning("settings:importBackup", error);
      let byteSize = expectedArchiveBytes;
      if (byteSize === undefined) {
        try {
          const temp = new File(fileUri);
          if (temp.exists) byteSize = temp.size;
        } catch {
          // ignore
        }
      }
      analytics.capture("backup_import_failed", {
        byte_size: byteSize ?? null,
      });
      const message = RESTORE_FAILURE_MESSAGE;
      void notifyBackupError("Restore failed", message);
      Alert.alert("Can’t restore backup", message);
    } finally {
      setImportController(null);
      try {
        const tempFile = new File(fileUri);
        if (tempFile.exists && tempFile.uri.includes(Paths.cache.uri)) {
          tempFile.delete();
        }
      } catch (cleanupErr) {
        logDevWarning("settings:cleanupImportTemp", cleanupErr);
      }
    }
  };

  const handleImport = async () => {
    if (isImporting || isExporting) return;

    let fileUri: string | null = null;
    try {
      fileUri = await pickBackupArchiveFile();
    } catch (_error) {
      Alert.alert("Couldn’t open file", "Unable to read the selected file.");
      return;
    }

    if (!fileUri) return;

    let preview: InspectBackupResult;
    try {
      preview = await inspectBackupArchive(fileUri);
    } catch (error) {
      logDevWarning("settings:inspectBackup", error);
      let byteSize: number | undefined;
      try {
        const temp = new File(fileUri);
        if (temp.exists) byteSize = temp.size;
      } catch {
        // ignore
      }
      analytics.capture("backup_inspect_failed", {
        error: error instanceof Error ? error.message : String(error),
        byte_size: byteSize ?? null,
      });
      Alert.alert("Can’t open backup", "This backup file appears to be corrupted or incomplete.");
      try {
        new File(fileUri).delete();
      } catch {
        // ignore
      }
      return;
    }

    const dateStr = new Date(preview.createdAt).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
    const entryLabel = `${preview.counts.entry.toLocaleString()} ${preview.counts.entry === 1 ? "entry" : "entries"}`;
    const startRestore = () =>
      void executeImport(fileUri, preview.counts, preview.uncompressedBytes, preview.archiveBytes);
    const cancelRestore = () => {
      try {
        new File(fileUri).delete();
      } catch {
        // ignore
      }
    };
    const alreadyHasContent = await hasLocalContentForRestore();
    Alert.alert(
      alreadyHasContent ? "Replace all local content?" : "Restore timeline?",
      alreadyHasContent
        ? `${entryLabel} from ${dateStr}.\n\nThis permanently deletes all local entries and media before restoring this backup. This cannot be undone.`
        : `${entryLabel} from ${dateStr}.`,
      [
        { text: "Cancel", style: "cancel", onPress: cancelRestore },
        {
          text: alreadyHasContent ? "Replace all local content" : "Restore",
          style: "destructive",
          onPress: startRestore,
        },
      ]
    );
  };

  const handleCancelImport = () => {
    cancelActiveRestore();
    void dismissBackupProgressNotification();
  };

  const confirmDeleteEntries = () =>
    confirmDestructive(
      "Delete all entries?",
      "This permanently removes every entry and its attached media. This cannot be undone.",
      "Delete",
      async () => deleteMediaFiles(await clearAll())
    );

  return (
    <SettingsScreenScroll>
      <SettingsGroup label="SECURITY">
        <View style={styles.container}>
          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <ThemedText style={[typography.settingLabel, { color: colors.text }]}>
                Require Biometric Unlock
              </ThemedText>
              <ThemedText style={[styles.caption, { color: colors.textSecondary }]}>
                {caption}
              </ThemedText>
            </View>
            <Switch
              value={enabled}
              onValueChange={(value) => void handleToggle(value)}
              disabled={!support?.available || verifying}
              trackColor={{ false: colors.line, true: colors.marker }}
              thumbColor={colors.surface}
              accessibilityLabel="Require biometric unlock setting"
            />
          </View>
        </View>
      </SettingsGroup>

      <SettingsGroup label="DATA BACKUP">
        <SettingsRow
          icon="upload"
          title="Export"
          subtitle={isExporting ? "Saving your backup" : "Save your timeline to a backup file"}
          badge={
            isExporting ? (
              <View style={styles.inFlightRow}>
                <ActivityIndicator size="small" color={colors.marker} />
                <Pressable
                  onPress={handleCancelExport}
                  hitSlop={8}
                  style={({ pressed }) => [styles.cancelBtn, pressed && press]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel export"
                >
                  <ThemedText
                    style={[typography.caption, { color: colors.destructive, fontWeight: "600" }]}
                  >
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>
            ) : undefined
          }
          showChevron={!isExporting}
          onPress={() => {
            if (!isExporting) void handleExport();
          }}
        />

        <SettingsRow
          icon="download"
          title="Import"
          subtitle={
            isImporting ? "Restoring backup" : "Replace your current timeline with a backup"
          }
          badge={
            isImporting ? (
              <View style={styles.inFlightRow}>
                <ActivityIndicator size="small" color={colors.marker} />
                <Pressable
                  onPress={handleCancelImport}
                  hitSlop={8}
                  style={({ pressed }) => [styles.cancelBtn, pressed && press]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel import"
                >
                  <ThemedText
                    style={[typography.caption, { color: colors.destructive, fontWeight: "600" }]}
                  >
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>
            ) : undefined
          }
          showChevron={!isImporting}
          onPress={() => {
            if (!isImporting) void handleImport();
          }}
        />
      </SettingsGroup>

      <SettingsGroup label="STORAGE">
        <Pressable
          onPress={confirmDeleteEntries}
          style={({ pressed }) => [styles.deleteBtn, pressed && press]}
          accessibilityRole="button"
          accessibilityLabel="Delete all entries permanently"
        >
          <ThemedText style={[typography.settingLabel, { color: colors.destructive }]}>
            Delete all entries
          </ThemedText>
        </Pressable>
      </SettingsGroup>
    </SettingsScreenScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.lg,
    paddingVertical: space.sm,
  },
  labelGroup: {
    flex: 1,
    gap: 2,
  },
  caption: {
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
  },
  deleteBtn: {
    paddingVertical: space.sm,
  },
  inFlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  cancelBtn: {
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
});
