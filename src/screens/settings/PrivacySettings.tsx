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
import { authenticate, type BiometricSupport, getBiometricSupport } from "@/services/auth";
import {
  cancelActiveBackup,
  cancelActiveRestore,
  copyBackupToDirectory,
  exportBackupArchive,
  type InspectBackupResult,
  importBackupArchive,
  inspectBackupArchive,
  pickBackupArchiveFile,
  pickBackupDestinationDirectory,
  setExportController,
  setImportController,
  useBackupStatus,
} from "@/services/backup";
import { deleteMediaList } from "@/services/media";
import {
  dismissBackupProgressNotification,
  notifyBackupError,
  notifyBackupExportComplete,
  notifyBackupImportComplete,
  notifyBackupProgress,
  requestNotificationPermission,
} from "@/services/notifications";
import { ThemedText } from "@/shared/components/ThemedText";
import { logDevWarning } from "@/shared/utils";
import { press, space, typography, usePreferences, useTheme } from "@/theme";

/**
 * Privacy & data category screen — everything about trust: the biometric
 * app lock under SECURITY, backup/export under BACKUP & EXPORT,
 * and storage management under STORAGE.
 */
export function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setSecurity } = usePreferences();
  const { clearAll } = useEntries();
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [verifying, setVerifying] = useState(false);
  const { isExporting, isImporting } = useBackupStatus();

  const enabled = preferences.security.biometricLock;

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
    if (!support) return "Checking device support…";
    if (!support.hasHardware) return "Not supported on this device.";
    if (!support.isEnrolled) return "Set up biometrics in device settings.";
    return "Require Face ID or fingerprint to open the app.";
  })();

  const handleToggle = async (value: boolean) => {
    if (!value) {
      setSecurity({ biometricLock: false });
      analytics.capture("biometric_lock_disabled");
      return;
    }

    if (!support?.available || verifying) return;

    // Confirm with a live scan before arming the lock.
    setVerifying(true);
    const confirmed = await authenticate("Enable biometric unlock");
    setVerifying(false);

    if (confirmed) {
      setSecurity({ biometricLock: true });
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

    void requestNotificationPermission();

    const controller = new AbortController();
    setExportController(controller);

    void notifyBackupProgress("Backing up OpenLog…", "Packaging your entries…");

    try {
      const result = await exportBackupArchive({
        signal: controller.signal,
        onProgress: (processed, total, phase) => {
          if (total === 0) return;
          const step = phase === "database" ? 1 : 10;
          if (processed % step !== 0 && processed !== total) return;
          const body =
            phase === "database"
              ? "Creating database snapshot…"
              : `Saving backup (${processed.toLocaleString()}/${total.toLocaleString()})…`;
          void notifyBackupProgress("Backing up OpenLog…", body);
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

      analytics.capture("backup_exported", {
        entry_count: result.counts.entry,
        byte_size: result.byteSize,
      });

      void notifyBackupExportComplete(result.counts.entry, result.byteSize);
    } catch (error) {
      if (controller.signal.aborted) {
        void dismissBackupProgressNotification();
        return;
      }
      logDevWarning("settings:exportBackup", error);
      void notifyBackupError(
        "Backup failed",
        "Could not store backup. Please check available device storage and try again."
      );
    } finally {
      setExportController(null);
    }
  };

  const handleCancelExport = () => {
    cancelActiveBackup();
    void dismissBackupProgressNotification();
  };

  const executeImport = async (fileUri: string) => {
    void requestNotificationPermission();

    const controller = new AbortController();
    setImportController(controller);

    void notifyBackupProgress("Restoring OpenLog…", "Restoring your entries…");

    try {
      const result = await importBackupArchive(fileUri, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      analytics.capture("backup_imported", {
        entry_count: result.importedCount,
      });

      void notifyBackupImportComplete(result.importedCount);
    } catch (error) {
      if (controller.signal.aborted) {
        void dismissBackupProgressNotification();
        return;
      }
      logDevWarning("settings:importBackup", error);
      void notifyBackupError(
        "Restore failed",
        "Could not restore backup. Please verify the selected file is valid."
      );
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to select backup file.";
      Alert.alert("Invalid File", msg);
      return;
    }

    if (!fileUri) return;

    let preview: InspectBackupResult;
    try {
      preview = await inspectBackupArchive(fileUri);
    } catch (error) {
      logDevWarning("settings:inspectBackup", error);
      const msg =
        error instanceof Error
          ? error.message
          : "This backup file could not be read or is corrupted.";
      Alert.alert("Cannot Restore Backup", msg);
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
    Alert.alert(
      "Restore Backup?",
      `This backup from ${dateStr} contains ${entryLabel}.\n\nRestoring will replace all current entries on this device. This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            try {
              new File(fileUri).delete();
            } catch {
              // ignore
            }
          },
        },
        {
          text: "Restore",
          style: "destructive",
          onPress: () => {
            void executeImport(fileUri);
          },
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
      async () => deleteMediaList(await clearAll())
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
          subtitle={
            isExporting
              ? "Packaging & saving to selected folder…"
              : "Save all your data to a backup file"
          }
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
            isImporting
              ? "Restoring entries…"
              : "Restore from a backup file, replacing current data"
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
