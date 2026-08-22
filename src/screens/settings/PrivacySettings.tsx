import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";

import { seedMockEntries, useEntries } from "@/modules/entry";
import { confirmDestructive, SettingsGroup, SettingsScreenScroll } from "@/modules/settings";
import { authenticate, type BiometricSupport, getBiometricSupport } from "@/services/auth";
import { deleteMediaList } from "@/services/media";
import { ThemedText } from "@/shared/components/ThemedText";
import { press, space, typography, usePreferences, useTheme } from "@/theme";

/**
 * Privacy & data category screen — everything about trust: the biometric
 * app lock under SECURITY, destructive storage controls under STORAGE.
 */
export function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setSecurity } = usePreferences();
  const { clearAll } = useEntries();
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [seeding, setSeeding] = useState(false);

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
      return;
    }

    if (!support?.available || verifying) return;

    // Confirm with a live scan before arming the lock.
    setVerifying(true);
    const confirmed = await authenticate("Enable biometric unlock");
    setVerifying(false);

    if (confirmed) {
      setSecurity({ biometricLock: true });
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
    setSeeding(true);
    try {
      await seedMockEntries(count);
      Alert.alert("Success", `Created ${count.toLocaleString()} test entries.`);
    } catch {
      Alert.alert("Error", "Failed to generate mock entries.");
    } finally {
      setSeeding(false);
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

        {__DEV__ ? (
          <View style={{ marginTop: space.md, gap: space.sm }}>
            <Pressable
              onPress={() => void handleSeed(1000)}
              disabled={seeding}
              style={({ pressed }) => [styles.deleteBtn, pressed && press]}
            >
              <ThemedText style={[typography.settingLabel, { color: colors.marker }]}>
                {seeding ? "Generating entries…" : "Generate 1,000 test entries (Dev)"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void handleSeed(10000)}
              disabled={seeding}
              style={({ pressed }) => [styles.deleteBtn, pressed && press]}
            >
              <ThemedText style={[typography.settingLabel, { color: colors.marker }]}>
                {seeding ? "Generating entries…" : "Generate 10,000 test entries (Dev)"}
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
