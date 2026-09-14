import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEntry,
  deleteAllEntries,
  deleteEntry,
  type EntryCursor,
  getEntryById,
  getPagedEntries,
  type NewEntryInput,
  type UpdateEntryInput,
  updateEntry,
} from "@/services/db/entries";
import { deleteMediaList } from "@/services/media";
import type { Entry } from "@/shared/types";
import { addDays, addMonths, startOfDay, startOfMonth } from "@/shared/utils/dates";
import { commitMediaUpdate } from "./mediaMutation";

export type EntryMutation =
  | { type: "add"; entry: Entry }
  | { type: "update"; entry: Entry }
  | { type: "delete"; id: string }
  | { type: "clear" }
  | { type: "reload" };

const mutationListeners = new Set<(mutation: EntryMutation) => void>();

function notifyMutation(mutation: EntryMutation) {
  mutationListeners.forEach((listener) => {
    listener(mutation);
  });
}

export function notifyStoreReload() {
  entryCache.clear();
  notifyMutation({ type: "reload" });
}

export function subscribeMutations(listener: (mutation: EntryMutation) => void) {
  mutationListeners.add(listener);
  return () => {
    mutationListeners.delete(listener);
  };
}

// In-memory single-entry cache for fast lookups
const entryCache = new Map<string, Entry>();

export async function addEntry(input: NewEntryInput): Promise<Entry> {
  const entry = await createEntry(input);
  entryCache.set(entry.id, entry);
  notifyMutation({ type: "add", entry });
  return entry;
}

export async function patchEntry(id: string, input: UpdateEntryInput): Promise<Entry> {
  const existing = entryCache.get(id) ?? (await getEntryById(id));
  const entry = existing
    ? await commitMediaUpdate({
        existing,
        input,
        update: () => updateEntry(id, input),
        cleanup: deleteMediaList,
      })
    : await updateEntry(id, input);
  entryCache.set(entry.id, entry);

  notifyMutation({ type: "update", entry });
  return entry;
}

export async function removeEntry(id: string): Promise<void> {
  const uris = await deleteEntry(id);
  await deleteMediaList(uris);
  entryCache.delete(id);
  notifyMutation({ type: "delete", id });
}

export async function removeImage(entryId: string, imageIndex: number): Promise<Entry | null> {
  const existing = entryCache.get(entryId) ?? (await getEntryById(entryId));
  if (!existing || imageIndex < 0 || imageIndex >= existing.images.length) return null;
  const nextImages = existing.images.filter((_, i) => i !== imageIndex);
  return patchEntry(entryId, { images: nextImages });
}

export async function removeAudio(entryId: string, audioIndex: number): Promise<Entry | null> {
  const existing = entryCache.get(entryId) ?? (await getEntryById(entryId));
  if (!existing || audioIndex < 0 || audioIndex >= existing.audios.length) return null;
  const nextAudios = existing.audios.filter((_, i) => i !== audioIndex);
  return patchEntry(entryId, { audios: nextAudios });
}

export async function clearAll(): Promise<string[]> {
  const uris = await deleteAllEntries();
  entryCache.clear();
  notifyMutation({ type: "clear" });
  return uris;
}

export async function fetchEntry(id: string): Promise<Entry | null> {
  const cached = entryCache.get(id);
  if (cached) return cached;
  const fetched = await getEntryById(id);
  if (fetched) entryCache.set(fetched.id, fetched);
  return fetched;
}

function matchesFilter(createdAt: number, monthTs?: number, dayTs?: number): boolean {
  if (dayTs !== undefined) {
    const start = startOfDay(dayTs);
    const end = addDays(start, 1);
    return createdAt >= start && createdAt < end;
  }
  if (monthTs !== undefined) {
    const start = startOfMonth(monthTs);
    const end = addMonths(monthTs, 1);
    return createdAt >= start && createdAt < end;
  }
  return true;
}

export interface UseTimelineEntriesOptions {
  monthTs?: number;
  dayTs?: number;
  pageSize?: number;
}

/**
 * Reactive paginated entry hook for the timeline.
 * Fetches page 1 on mount, supports non-blocking cursor prefetching, and
 * updates in-memory items automatically on mutations.
 */
export function useTimelineEntries(options: UseTimelineEntriesOptions = {}) {
  const { monthTs, dayTs, pageSize = 50 } = options;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const nextCursorRef = useRef<EntryCursor | undefined>(undefined);
  const isFetchingMoreRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPagedEntries({ monthTs, dayTs, limit: pageSize });
      for (const item of res.entries) {
        entryCache.set(item.id, item);
      }
      setEntries(res.entries);
      setHasMore(res.hasMore);
      nextCursorRef.current = res.nextCursor;
    } finally {
      setIsLoading(false);
    }
  }, [monthTs, dayTs, pageSize]);

  const loadInitialRef = useRef(loadInitial);
  loadInitialRef.current = loadInitial;

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingMoreRef.current || !nextCursorRef.current) {
      return;
    }
    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);

    try {
      const res = await getPagedEntries({
        cursor: nextCursorRef.current,
        monthTs,
        dayTs,
        limit: pageSize,
      });

      for (const item of res.entries) {
        entryCache.set(item.id, item);
      }

      setEntries((prev) => [...prev, ...res.entries]);
      setHasMore(res.hasMore);
      nextCursorRef.current = res.nextCursor;
    } finally {
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    }
  }, [hasMore, monthTs, dayTs, pageSize]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  // Subscribe to real-time mutations
  useEffect(() => {
    return subscribeMutations((mutation) => {
      if (mutation.type === "clear") {
        setEntries([]);
        setHasMore(false);
        nextCursorRef.current = undefined;
        return;
      }

      if (mutation.type === "reload") {
        void loadInitialRef.current();
        return;
      }

      if (mutation.type === "delete") {
        setEntries((prev) => prev.filter((e) => e.id !== mutation.id));
        return;
      }

      if (mutation.type === "update") {
        setEntries((prev) => prev.map((e) => (e.id === mutation.entry.id ? mutation.entry : e)));
        return;
      }

      if (mutation.type === "add") {
        if (matchesFilter(mutation.entry.createdAt, monthTs, dayTs)) {
          setEntries((prev) => {
            const next = [mutation.entry, ...prev.filter((e) => e.id !== mutation.entry.id)];
            return next.sort((a, b) => b.createdAt - a.createdAt);
          });
        }
      }
    });
  }, [monthTs, dayTs]);

  return {
    entries,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    refresh: loadInitial,
  };
}

/** Hook to fetch and listen to a single entry's live state. */
export function useEntry(id?: string): Entry | null | undefined {
  const [entry, setEntry] = useState<Entry | null | undefined>(() =>
    id ? entryCache.get(id) : null
  );

  useEffect(() => {
    if (!id) {
      setEntry(null);
      return;
    }

    const cached = entryCache.get(id);
    if (cached) {
      setEntry(cached);
    }

    let active = true;
    let requestVersion = 0;
    const loadEntry = () => {
      const version = requestVersion + 1;
      requestVersion = version;
      void fetchEntry(id)
        .then((result) => {
          if (active && requestVersion === version) setEntry(result);
        })
        .catch(() => {
          if (active && requestVersion === version) setEntry(null);
        });
    };

    loadEntry();

    const unsubscribe = subscribeMutations((mutation) => {
      if (mutation.type === "clear" || (mutation.type === "delete" && mutation.id === id)) {
        requestVersion += 1;
        setEntry(null);
      } else if (mutation.type === "update" && mutation.entry.id === id) {
        requestVersion += 1;
        setEntry(mutation.entry);
      } else if (mutation.type === "reload") {
        loadEntry();
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [id]);

  return entry;
}

/** Backward compatibility / actions helper. */
export function useEntries() {
  return {
    addEntry,
    patchEntry,
    removeEntry,
    removeImage,
    removeAudio,
    clearAll,
    getEntry: fetchEntry,
  };
}
