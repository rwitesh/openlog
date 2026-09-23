import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { analytics } from "@/config/analytics";
import { authenticate, getEnrolledAuthLevel } from "./auth";

const UNLOCK_REASON = "Unlock your entries";
const BACKGROUND_LOCK_THRESHOLD_MS = 60 * 1000; // 1 minute in background before re-locking

/**
 * Owns the app-lock gate:
 *   - opens locked and prompts while the lock is enabled
 *   - re-locks after > 60 seconds in background
 *   - opens directly when the device has no unlock method left, so the user
 *     is never trapped outside their data (the enabled preference is kept and
 *     the lock resumes once a screen lock exists again)
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

    try {
      if ((await getEnrolledAuthLevel()) === "none") {
        // Nothing on the device can verify the owner; prompting could never
        // succeed and reinstalling would destroy the local timeline.
        analytics.capture("app_lock_bypassed");
        setLocked(false);
        return;
      }

      if (await authenticate(UNLOCK_REASON)) {
        setLocked(false);
      }
    } finally {
      promptingRef.current = false;
      setPrompting(false);
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
