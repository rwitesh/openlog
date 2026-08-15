import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { authenticate } from "./auth";
import { APP_NAME } from "@/shared/constants";

const UNLOCK_REASON = "Unlock your entries";

/**
 * Owns the app-lock lifecycle while the lock preference is enabled:
 *   - cold start: locked, prompt immediately
 *   - enabled mid-session: armed silently (the enabling scan already verified)
 *   - background → foreground: re-lock, prompt again
 *   - preference disabled: gate opens and stays open
 *
 * Render-time state only — the lock preference itself lives in PreferencesContext.
 */
export function useAppLock(enabled: boolean) {
  const [locked, setLocked] = useState(enabled);
  const [prompting, setPrompting] = useState(false);

  const enabledRef = useRef(enabled);
  const lockedRef = useRef(locked);
  const promptingRef = useRef(false);
  const firstArmRef = useRef(true);
  enabledRef.current = enabled;
  lockedRef.current = locked;

  const lock = useCallback(() => {
    if (!enabledRef.current) return;
    setLocked(true);
  }, []);

  const unlock = useCallback(async () => {
    if (promptingRef.current || !lockedRef.current) return;

    promptingRef.current = true;
    setPrompting(true);

    const success = await authenticate(UNLOCK_REASON);

    promptingRef.current = false;
    setPrompting(false);

    // A scan that succeeds after the lock was disabled mid-prompt still opens the gate.
    if (success && enabledRef.current) {
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    const isFirstArm = firstArmRef.current;
    firstArmRef.current = false;

    if (!enabled) {
      // Turning the lock off from Settings must clear any pending lock.
      setLocked(false);
      return;
    }

    // Cold start with the lock already on: prompt right away. Arming from
    // Settings stays silent — the enabling scan just verified the owner.
    if (isFirstArm) {
      setLocked(true);
      void unlock();
    }
  }, [enabled, unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        // Arm silently; prompt when the user returns.
        lock();
      } else if (state === "active") {
        if (lockedRef.current) void unlock();
      }
    });

    return () => subscription.remove();
  }, [lock, unlock]);

  return { locked, prompting, unlock };
}
