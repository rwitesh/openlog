import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPlace } from "@/lib/location";
import type { EntryLocation } from "@/types/entry";

import { useDebouncedCallback } from "./useDebouncedCallback";

const TYPING_REFRESH_MS = 3000;

export function useLocation(text: string, initialLocation?: EntryLocation) {
  const [on, setOn] = useState(Boolean(initialLocation));
  const [place, setPlace] = useState<EntryLocation | null>(initialLocation ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const wantsRef = useRef(Boolean(initialLocation));
  const placeRef = useRef<EntryLocation | null>(initialLocation ?? null);
  const fetchGenRef = useRef(0);
  const cancelledRef = useRef(false);
  placeRef.current = place;

  const isCancelled = (generation: number) =>
    cancelledRef.current || fetchGenRef.current !== generation;

  const cancelFetch = useCallback(() => {
    cancelledRef.current = true;
    fetchGenRef.current += 1;
    wantsRef.current = false;
    setLoading(false);
    setFailed(false);
  }, []);

  const fetch = useCallback(async (showLoading: boolean) => {
    const generation = ++fetchGenRef.current;
    cancelledRef.current = false;

    if (!wantsRef.current) return;

    if (showLoading) setLoading(true);
    setFailed(false);

    try {
      const loc = await fetchPlace({
        isCancelled: () => isCancelled(generation),
      });

      if (isCancelled(generation) || !wantsRef.current) return;

      if (loc) {
        setPlace(loc);
        setOn(true);
        setFailed(false);
      } else {
        setOn(false);
        setFailed(true);
      }
    } finally {
      if (!isCancelled(generation) && wantsRef.current) setLoading(false);
    }
  }, []);

  const activate = useCallback(
    async (silent = false) => {
      wantsRef.current = true;

      if (placeRef.current) {
        setOn(true);
        setFailed(false);
        await fetch(false);
        return;
      }

      await fetch(!silent);
    },
    [fetch]
  );

  const refreshWhileOn = useDebouncedCallback(() => {
    if (!wantsRef.current || !on) return;
    void fetch(false);
  }, TYPING_REFRESH_MS);

  useEffect(() => {
    if (!text.trim()) return;
    refreshWhileOn();
  }, [text, refreshWhileOn]);

  const toggle = useCallback(async () => {
    if (loading) {
      cancelFetch();
      setOn(false);
      return;
    }

    if (on) {
      wantsRef.current = false;
      setOn(false);
      setFailed(false);
      return;
    }

    await activate(Boolean(place));
  }, [loading, on, place, cancelFetch, activate]);

  return {
    on,
    place,
    loading,
    failed,
    toggle,
  };
}
