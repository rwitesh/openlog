import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { analytics } from "@/config/analytics";
import { authenticate, getEnrolledAuthLevel } from "./auth";

const UNLOCK_REASON = "Unlock your entries";
const BACKGROUND_LOCK_THRESHOLD_MS = 60 * 1000; // 1 minute in background before re-locking

const AppLockedContext = createContext(false);

export const AppLockedProvider = AppLockedContext.Provider;

/**
 * True while the app is locked. Native modals draw in their own window above the
 * lock screen, so they must stop rendering while this holds. They deliberately
 * stay up through brief inactive states: dismissing a modal there interrupts
 * anything it presented (share sheet, permission alert) and resets its content.
 */
export function useAppLocked(): boolean {
  return useContext(AppLockedContext);
}

/**
 * Owns the app-lock gate:
 *   - opens locked and prompts while the lock is enabled
 *   - hides content whenever the app is not active; this renders from JS, so
 *     the OS may take its app-switcher snapshot before the cover lands
 *   - re-locks after > 60 seconds in background
 *   - opens directly when the device has no unlock method left, so the user
 *     is never trapped outside their data (the enabled preference is kept and
 *     the lock resumes once a screen lock exists again)
 */
export function useAppLock(enabled: boolean) {
  const [locked, setLocked] = useState(enabled);
  const [prompting, setPrompting] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

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
      setAppState(nextState);
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

  // The re-lock decision lands in the same update as "active", so content never
  // shows for a frame between the cover lifting and the lock screen appearing.
  const contentHidden = enabled && (locked || appState === "inactive" || appState === "background");

  return { locked, contentHidden, prompting, unlock };
}
