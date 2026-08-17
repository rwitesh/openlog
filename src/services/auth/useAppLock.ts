import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { authenticate } from "./auth";

const UNLOCK_REASON = "Unlock your entries";
const BACKGROUND_LOCK_THRESHOLD_MS = 60 * 1000; // 1 minute in background before re-locking

/**
 * Owns the app-lock gate:
 *   - App opens with the lock on: locked, prompt once
 *   - App backgrounded for > 60 seconds: re-locks upon resume
 *   - Disabled from Settings: gate opens immediately
 */
export function useAppLock(enabled: boolean) {
  const [locked, setLocked] = useState(enabled);
  const [prompting, setPrompting] = useState(false);

  const lockedRef = useRef(locked);
  const promptingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const backgroundTimeRef = useRef<number | null>(null);

  lockedRef.current = locked;
  enabledRef.current = enabled;

  const unlock = useCallback(async () => {
    if (promptingRef.current || !lockedRef.current) return;

    promptingRef.current = true;
    setPrompting(true);

    const success = await authenticate(UNLOCK_REASON);

    promptingRef.current = false;
    setPrompting(false);
    if (success) {
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    // Cold start prompt
    void unlock();
  }, [enabled, unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (!enabledRef.current) return;

      if (nextState === "background") {
        backgroundTimeRef.current = Date.now();
      } else if (nextState === "active") {
        if (backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          backgroundTimeRef.current = null;

          if (elapsed > BACKGROUND_LOCK_THRESHOLD_MS) {
            setLocked(true);
            lockedRef.current = true;
            void unlock();
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [unlock]);

  return { locked, prompting, unlock };
}
