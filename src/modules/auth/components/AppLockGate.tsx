/**
 * AppLockGate — the biometric lock surface for the whole app.
 *
 * Mounted once at the root, after bootstrap has resolved the device-bound lock
 * state, so it starts with the correct armed value. That state lives in secure
 * device-local storage: restoring a backup on another device never arms or
 * disarms this device's lock. While enabled it renders the themed lock screen
 * over the app content when locked, and a plain cover whenever the app is not
 * active. Modals stop rendering while locked, since their native windows would
 * otherwise sit above the lock screen.
 *
 * Children are kept continuously mounted so in-progress compose drafts,
 * media selections, and navigation states are preserved across lock cycles.
 */

import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppLockedProvider, useAppLock, useBiometricLock } from "@/services/auth";
import { useTheme } from "@/theme";
import { LockScreen } from "./LockScreen";

interface AppLockGateProps {
  children: ReactNode;
}

export function AppLockGate({ children }: AppLockGateProps) {
  const { enabled } = useBiometricLock();
  const { locked, contentHidden, prompting, unlock } = useAppLock(enabled);
  const { colors } = useTheme().theme;

  return (
    <AppLockedProvider value={locked}>
      <View style={styles.container}>
        <View
          style={styles.container}
          pointerEvents={contentHidden ? "none" : "auto"}
          aria-hidden={contentHidden}
          accessibilityElementsHidden={contentHidden}
          importantForAccessibility={contentHidden ? "no-hide-descendants" : "auto"}
        >
          {children}
        </View>
        {contentHidden ? (
          <View style={[styles.overlay, { backgroundColor: colors.background }]}>
            {locked ? <LockScreen prompting={prompting} onUnlock={() => void unlock()} /> : null}
          </View>
        ) : null}
      </View>
    </AppLockedProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    elevation: 999,
  },
});
