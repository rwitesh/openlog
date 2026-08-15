import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { authenticate, getBiometricSupport, type BiometricSupport } from "@/services/auth";
import { usePreferences, useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { ThemedText } from "@/shared/components/ThemedText";

/**
 * Settings row that arms/disarms the biometric app lock.
 *
 * Enabling requires a successful live scan first, so the lock can never
 * be turned on for a device that can't actually verify the owner.
 */
export function BiometricLockRow() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setSecurity } = usePreferences();
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  const [verifying, setVerifying] = useState(false);

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
    if (!support.hasHardware) return "Biometric unlock isn't supported on this device.";
    if (!support.isEnrolled) {
      return "Enroll biometrics in your device settings to enable app lock.";
    }
    return enabled
      ? "Your entries lock whenever the app moves to the background."
      : "Lock your entries whenever the app opens or returns from the background.";
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

  return (
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
  );
}

const styles = StyleSheet.create({
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
});
