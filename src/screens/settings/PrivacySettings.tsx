import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, View } from "react-native";

import { analytics } from "@/config/analytics";
import { seedMockEntries, useEntries } from "@/modules/entry";
import {
  confirmDestructive,
  SettingsGroup,
  SettingsRow,
  SettingsScreenScroll,
} from "@/modules/settings";
import { authenticate, type BiometricSupport, getBiometricSupport } from "@/services/auth";
import {
  exportBackupArchive,
  importBackupArchive,
  inspectBackupArchive,
  pickBackupArchiveFile,
  saveBackupArchive,
} from "@/services/backup";
import { deleteMediaList } from "@/services/media";
import { notifyBackupExportComplete, notifyBackupImportComplete } from "@/services/notifications";
import { ThemedText } from "@/shared/components/ThemedText";
import { IS_EXPO_GO, logDevWarning } from "@/shared/utils";
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
  const [seedingCount, setSeedingCount] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
    if (isExporting) return;
    setIsExporting(true);
    try {
      const result = await exportBackupArchive();
      void notifyBackupExportComplete(result.entryCount, result.mediaCount);
      const saved = await saveBackupArchive(result.fileUri, result.filename);
      if (saved) {
        analytics.capture("backup_exported", {
          entry_count: result.entryCount,
          media_count: result.mediaCount,
          byte_size: result.byteSize,
        });
        void notifyBackupExportComplete(result.entryCount, result.mediaCount);
        Alert.alert(
          "Backup Saved",
          `${result.entryCount.toLocaleString()} entries and ${result.mediaCount} media files.`
        );
      }
    } catch (error) {
      logDevWarning("settings:exportBackup", error);
      Alert.alert(
        "Save Failed",
        "Could not store backup. Please check available device storage and try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const performImport = async (fileUri: string) => {
    setIsImporting(true);
    try {
      const result = await importBackupArchive(fileUri);
      analytics.capture("backup_imported", {
        entry_count: result.importedCount,
        media_count: result.mediaCount,
      });
      void notifyBackupImportComplete(result.importedCount, result.mediaCount);
      Alert.alert(
        "Import Complete",
        `Successfully restored ${result.importedCount.toLocaleString()} entries and ${result.mediaCount} media files.`
      );
    } catch (error) {
      logDevWarning("settings:importBackup", error);
      Alert.alert("Restore Failed", `Could not restore. Please select a valid backup file.`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (isImporting) return;
    try {
      const fileUri = await pickBackupArchiveFile();
      if (!fileUri) return;

      const info = await inspectBackupArchive(fileUri);
      const dateStr = new Date(info.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      Alert.alert(
        "Restore Backup",
        `Backup from ${dateStr} with ${info.entryCount.toLocaleString()} entries.\n\nThis replaces all entries and media currently on this device.`,
        [
          {
            text: "Restore",
            style: "destructive",
            onPress: () => void performImport(fileUri),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } catch (error) {
      logDevWarning("settings:inspectArchive", error);
      Alert.alert("Invalid File", "Please select a valid backup file.");
    }
  };

  const confirmDeleteEntries = () =>
    confirmDestructive(
      "Delete all entries?",
      "This permanently removes every entry and its attached media. This cannot be undone.",
      "Delete",
      async () => deleteMediaList(await clearAll())
    );

  const handleSeed = async (count: number) => {
    setSeedingCount(count);
    try {
      await seedMockEntries(count);
      Alert.alert("Success", `Created ${count.toLocaleString()} test entries.`);
    } catch {
      Alert.alert("Error", "Failed to generate mock entries.");
    } finally {
      setSeedingCount(null);
    }
  };

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
          subtitle={isExporting ? "Saving backup…" : "Save all your data to a backup file"}
          badge={isExporting ? <ActivityIndicator size="small" color={colors.marker} /> : undefined}
          showChevron={false}
          onPress={() => void handleExport()}
        />

        <SettingsRow
          icon="download"
          title="Import"
          subtitle={
            isImporting ? "Restoring…" : "Restore from a backup file, replacing current data"
          }
          badge={isImporting ? <ActivityIndicator size="small" color={colors.marker} /> : undefined}
          showChevron={false}
          onPress={() => void handleImport()}
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

        {IS_EXPO_GO ? (
          <View style={{ marginTop: space.md, gap: space.sm }}>
            <Pressable
              onPress={() => void handleSeed(1000)}
              disabled={seedingCount !== null}
              style={({ pressed }) => [styles.deleteBtn, pressed && press]}
            >
              <ThemedText style={[typography.settingLabel, { color: colors.marker }]}>
                {seedingCount === 1000
                  ? "Generating 1,000 entries…"
                  : "Generate 1,000 test entries (Expo Go)"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void handleSeed(10000)}
              disabled={seedingCount !== null}
              style={({ pressed }) => [styles.deleteBtn, pressed && press]}
            >
              <ThemedText style={[typography.settingLabel, { color: colors.marker }]}>
                {seedingCount === 10000
                  ? "Generating 10,000 entries…"
                  : "Generate 10,000 test entries (Expo Go)"}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
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
});
