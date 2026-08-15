import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPlace } from "./location";
import type { EntryLocation } from "@/shared/types";
import { useDebouncedCallback } from "@/shared/hooks/useDebouncedCallback";

const TYPING_REFRESH_MS = 3000;

/**
 * Location attach state for the compose screen.
 *
 * `on` is the intent to attach a place; `place` is the resolved place.
 * Only `toggle()` (an explicit chip tap) may show the OS permission
 * dialog — automatic fetches run silently, see `fetchPlace`.
 */
export function useLocation(
  text: string,
  initialLocation?: EntryLocation,
  autoEnable = false
) {
  const [on, setOn] = useState(Boolean(initialLocation) || autoEnable);
  const [place, setPlace] = useState<EntryLocation | null>(initialLocation ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const wants = useRef(on);
  // Bumped on every fetch and on turn-off: only the latest fetch may apply
  // its result, so a stale response can never resurrect a detached location.
  const fetchId = useRef(0);

  const resolve = useCallback(async (opts: { prompt?: boolean; spinner?: boolean } = {}) => {
    const id = ++fetchId.current;

    if (opts.spinner) setLoading(true);
    setFailed(false);

    const loc = await fetchPlace({ prompt: opts.prompt });

    if (id !== fetchId.current) return;

    setLoading(false);
    if (loc) {
      setPlace(loc);
      setOn(true);
    } else {
      setOn(false);
      setFailed(true);
    }
  }, []);

  const turnOff = useCallback(() => {
    fetchId.current += 1; // invalidate any in-flight fetch
    wants.current = false;
    setOn(false);
    setFailed(false);
    setLoading(false);
  }, []);

  // Auto-detect preference: attach silently when compose opens.
  useEffect(() => {
    if (autoEnable && !initialLocation) void resolve();
  }, [autoEnable, initialLocation, resolve]);

  // Keep the place fresh while writing.
  const refreshWhileOn = useDebouncedCallback(() => {
    if (wants.current && on) void resolve();
  }, TYPING_REFRESH_MS);

  useEffect(() => {
    if (text.trim()) refreshWhileOn();
  }, [text, refreshWhileOn]);

  const toggle = useCallback(async () => {
    if (on || loading) {
      turnOff();
      return;
    }
    wants.current = true;
    if (place) {
      setOn(true); // re-attach the known place right away
      setFailed(false);
    }
    await resolve({ prompt: true, spinner: !place });
  }, [on, loading, place, turnOff, resolve]);

  return { on, place, loading, failed, toggle };
}
