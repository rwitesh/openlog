/**
 * AppLockGate — the biometric lock surface for the whole app.
 *
 * Mounted once at the root (inside AppProviders, so preferences and theme
 * are available). While `security.biometricLock` is enabled and the app is
 * locked it renders the themed lock screen instead of app content; the
 * lock lifecycle itself lives in `useAppLock`.
 */

import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";

import { useAppLock } from "@/services/auth";
import { usePreferences, useTheme } from "@/theme";
import { LockScreen } from "./LockScreen";

interface AppLockGateProps {
  children: ReactNode;
}

export function AppLockGate({ children }: AppLockGateProps) {
  const { preferences } = usePreferences();
  const { mode } = useTheme();
  const { locked, prompting, unlock } = useAppLock(preferences.security.biometricLock);

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <LockScreen prompting={prompting} onUnlock={() => void unlock()} />
    </>
  );
}
