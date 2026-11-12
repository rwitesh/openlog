/**
 * AppLockGate — the biometric lock surface for the whole app.
 *
 * Mounted once at the root, after bootstrap has resolved the device-bound lock
 * state, so it starts with the correct armed value. That state lives in secure
 * device-local storage: restoring a backup on another device never arms or
 * disarms this device's lock. While enabled it renders the themed lock screen
 * over the app content when locked, and a plain cover whenever the app is not
 * active. Modals read the same state and stop rendering, since their native
 * windows would otherwise sit above both surfaces.
 *
 * Children are kept continuously mounted so in-progress compose drafts,
 * media selections, and navigation states are preserved across lock cycles.
 */

import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ContentHiddenProvider, useAppLock, useBiometricLock } from "@/services/auth";
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
    <ContentHiddenProvider value={contentHidden}>
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
        {locked ? (
          <View style={styles.overlay}>
            <LockScreen prompting={prompting} onUnlock={() => void unlock()} />
          </View>
        ) : contentHidden ? (
          <View style={[styles.overlay, { backgroundColor: colors.background }]} />
        ) : null}
      </View>
    </ContentHiddenProvider>
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
