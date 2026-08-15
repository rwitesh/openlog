import { useCallback, useEffect, useRef, useState } from "react";

import { authenticate } from "./auth";

const UNLOCK_REASON = "Unlock your entries";

/**
 * Owns the app-lock gate:
 *   - app opens with the lock on: locked, prompt once
 *   - enabled from Settings mid-session: stays open (that scan just verified)
 *   - disabled from Settings: gate opens
 *
 * There is deliberately no background/foreground re-lock. OS permission
 * dialogs and pickers also pause the app, so re-locking on AppState made
 * the lock fire in the middle of normal screens.
 */
export function useAppLock(enabled: boolean) {
  const [locked, setLocked] = useState(enabled);
  const [prompting, setPrompting] = useState(false);

  const lockedRef = useRef(locked);
  const promptingRef = useRef(false);
  lockedRef.current = locked;

  const unlock = useCallback(async () => {
    if (promptingRef.current || !lockedRef.current) return;

    promptingRef.current = true;
    setPrompting(true);

    const success = await authenticate(UNLOCK_REASON);

    promptingRef.current = false;
    setPrompting(false);
    if (success) setLocked(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocked(false); // turning the lock off opens the gate
      return;
    }
    // Cold start: prompt over the lock screen. Enabling from Settings is
    // silent — locked is false mid-session, so this is a no-op there.
    void unlock();
  }, [enabled, unlock]);

  return { locked, prompting, unlock };
}
