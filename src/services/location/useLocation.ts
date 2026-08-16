import { useCallback, useRef, useState } from "react";

import { fetchPlace } from "./location";
import type { EntryLocation } from "@/shared/types";

/**
 * Location attach state for the compose screen.
 *
 * `on` is the explicit user intent to attach location.
 * `place` is the resolved place data.
 * Location is strictly opt-in: no automatic fetching, no background tracking,
 * no refresh on typing. Fetches only occur when the user explicitly triggers an action.
 */
export function useLocation(initialLocation?: EntryLocation | null) {
  const [on, setOn] = useState(Boolean(initialLocation));
  const [place, setPlace] = useState<EntryLocation | null>(initialLocation ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Bumped on every fetch and on detach so stale responses are safely ignored.
  const fetchId = useRef(0);

  const fetchAndAttach = useCallback(async (promptForPermission = true) => {
    const id = ++fetchId.current;
    setLoading(true);
    setFailed(false);

    try {
      const loc = await fetchPlace({ prompt: promptForPermission });
      if (id !== fetchId.current) return;

      setLoading(false);
      if (loc) {
        setPlace(loc);
        setOn(true);
        setFailed(false);
      } else {
        setFailed(true);
        if (!place) {
          setOn(false);
        }
      }
    } catch {
      if (id !== fetchId.current) return;
      setLoading(false);
      setFailed(true);
    }
  }, [place]);

  const request = useCallback(async () => {
    await fetchAndAttach(true);
  }, [fetchAndAttach]);

  const refresh = useCallback(async () => {
    await fetchAndAttach(true);
  }, [fetchAndAttach]);

  const remove = useCallback(() => {
    fetchId.current += 1;
    setOn(false);
    setPlace(null);
    setFailed(false);
    setLoading(false);
  }, []);

  const toggle = useCallback(async () => {
    if (loading) return;
    if (on) {
      remove();
    } else {
      await request();
    }
  }, [loading, on, remove, request]);

  return {
    on,
    place,
    loading,
    failed,
    request,
    refresh,
    remove,
    toggle,
  };
}
