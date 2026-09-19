import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { reportError } from "@/shared/utils/devLog";

/**
 * Device-bound app-lock state.
 *
 * The biometric lock is tied to this device's hardware and keychain, so it is
 * persisted in secure device-local storage instead of the settings table.
 * Backups therefore never carry the lock state to another device: each device
 * arms its own lock.
 */

const BIOMETRIC_LOCK_KEY = "applock.biometric";

type BiometricLockListener = (enabled: boolean) => void;

// Module cache keeps consumers (gate, settings screens) in sync and lets the
// lock gate mount with the correct armed state after bootstrap resolves it.
let cachedEnabled: boolean | null = null;
const listeners = new Set<BiometricLockListener>();

function publish(enabled: boolean): void {
  for (const listener of listeners) listener(enabled);
}

export async function getBiometricLockEnabled(): Promise<boolean> {
  if (cachedEnabled !== null) return cachedEnabled;
  if (Platform.OS === "web") return false;
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_LOCK_KEY);
    cachedEnabled = value === "true";
    return cachedEnabled;
  } catch {
    return false;
  }
}

export async function setBiometricLockEnabled(value: boolean): Promise<void> {
  cachedEnabled = value;
  publish(value);
  if (Platform.OS === "web") return;
  try {
    if (value) {
      await SecureStore.setItemAsync(BIOMETRIC_LOCK_KEY, "true");
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_LOCK_KEY);
    }
  } catch (error) {
    reportError("app_lock_persist_failed", {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function subscribeBiometricLock(listener: BiometricLockListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface BiometricLockSetting {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

/** Tracks the device-bound lock state; starts synchronously once bootstrap has resolved it. */
export function useBiometricLock(): BiometricLockSetting {
  const [enabled, setEnabledState] = useState(() => cachedEnabled ?? false);

  useEffect(() => {
    let active = true;
    if (cachedEnabled === null) {
      getBiometricLockEnabled()
        .then((value) => {
          if (active) setEnabledState(value);
        })
        .catch(() => undefined);
    }
    const unsubscribe = subscribeBiometricLock((value) => {
      if (active) setEnabledState(value);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    void setBiometricLockEnabled(value);
  }, []);

  return { enabled, setEnabled };
}
