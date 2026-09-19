/**
 * AppLockGate — the biometric lock surface for the whole app.
 *
 * Mounted once at the root, after bootstrap has resolved the device-bound lock
 * state, so it starts with the correct armed value. That state lives in secure
 * device-local storage: restoring a backup on another device never arms or
 * disarms this device's lock. While enabled and the app is locked it renders
 * the themed lock screen as a full-screen overlay above the app content.
 *
 * Children are kept continuously mounted so in-progress compose drafts,
 * media selections, and navigation states are preserved across lock cycles.
 */

import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useAppLock, useBiometricLock } from "@/services/auth";
import { LockScreen } from "./LockScreen";

interface AppLockGateProps {
  children: ReactNode;
}

export function AppLockGate({ children }: AppLockGateProps) {
  const { enabled } = useBiometricLock();
  const { locked, prompting, unlock } = useAppLock(enabled);

  return (
    <View style={styles.container}>
      <View
        style={styles.container}
        pointerEvents={locked ? "none" : "auto"}
        aria-hidden={locked}
        accessibilityElementsHidden={locked}
        importantForAccessibility={locked ? "no-hide-descendants" : "auto"}
      >
        {children}
      </View>
      {locked ? (
        <View style={styles.overlay}>
          <LockScreen prompting={prompting} onUnlock={() => void unlock()} />
        </View>
      ) : null}
    </View>
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
