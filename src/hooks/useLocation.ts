import { useCallback, useEffect, useRef, useState } from "react";

import { getAutoLocation } from "@/db/settings";
import { fetchPlace } from "@/lib/location";
import type { EntryLocation } from "@/types/entry";

import { useDebouncedCallback } from "./useDebouncedCallback";

const TYPING_REFRESH_MS = 3000;

export function useLocation(text: string) {
  const [on, setOn] = useState(false);
  const [place, setPlace] = useState<EntryLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const autoRef = useRef(false);
  const optedOutRef = useRef(false);
  const wantsRef = useRef(false);
  const placeRef = useRef<EntryLocation | null>(null);
  const textRef = useRef(text);
  const fetchGenRef = useRef(0);
  const cancelledRef = useRef(false);
  textRef.current = text;
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
      optedOutRef.current = false;

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
    if (!autoRef.current || optedOutRef.current || !wantsRef.current || !on) return;
    void fetch(false);
  }, TYPING_REFRESH_MS);

  useEffect(() => {
    getAutoLocation().then((auto) => {
      autoRef.current = auto;
      if (auto && !optedOutRef.current) {
        void activate(Boolean(placeRef.current));
      }
    });
  }, [activate]);

  useEffect(() => {
    if (!text.trim()) return;
    refreshWhileOn();
  }, [text, refreshWhileOn]);

  const toggle = useCallback(async () => {
    if (loading) {
      optedOutRef.current = true;
      cancelFetch();
      setOn(false);
      return;
    }

    if (on) {
      optedOutRef.current = true;
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
