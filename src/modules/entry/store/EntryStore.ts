import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEntry,
  deleteAllEntries,
  deleteEntry,
  type EntryCursor,
  filterUnreferencedMedia,
  getEntryById,
  getPagedEntries,
  type NewEntryInput,
  type UpdateEntryInput,
  updateEntry,
} from "@/services/db/entries";
import { discardAllDrafts, discardDraft } from "@/services/drafts/store";
import {
  assertCopiedMediaPresent,
  deleteMediaFiles,
  deleteUnreferencedMedia,
  releaseMediaCopies,
} from "@/services/media";
import type { Entry } from "@/shared/types";
import { addDays, addMonths, startOfDay, startOfMonth } from "@/shared/utils/dates";
import { reportError } from "@/shared/utils/devLog";
import { removedMedia } from "./mediaDiff";

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

async function cleanupMedia(filenames: string[]): Promise<void> {
  if (!filenames.length) return;
  await deleteMediaFiles({ select: () => filterUnreferencedMedia(filenames) });
}

/** Deletes media files no entry references. */
export async function sweepUnreferencedMedia(): Promise<void> {
  await deleteUnreferencedMedia(async (filenames) => {
    // An empty timeline deletes nothing: after a lost, reset, or unreadable database these files
    // may be the only copy left. The cost is that files left by an interrupted "Delete all", or
    // by a save that failed while the timeline was empty, stay until an entry exists.
    const { entries } = await getPagedEntries({ limit: 1 });
    return entries.length > 0 ? filterUnreferencedMedia(filenames) : [];
  });
}

function inputMedia(input: NewEntryInput | UpdateEntryInput): string[] {
  return [
    ...(input.images ?? []),
    ...(input.audios ?? []),
    ...(input.attachments ?? []).map((attachment) => attachment.uri),
  ];
}

export async function addEntry(input: NewEntryInput): Promise<Entry> {
  const media = inputMedia(input);
  let entry: Entry;
  try {
    await assertCopiedMediaPresent(media);
    entry = await createEntry(input);
  } finally {
    releaseMediaCopies(media);
  }
  entryCache.set(entry.id, entry);
  notifyMutation({ type: "add", entry });
  return entry;
}

export async function patchEntry(id: string, input: UpdateEntryInput): Promise<Entry> {
  const media = inputMedia(input);
  let existing: Entry | null;
  let entry: Entry;
  try {
    existing = entryCache.get(id) ?? (await getEntryById(id));
    await assertCopiedMediaPresent(media);
    entry = await updateEntry(id, input);
  } finally {
    releaseMediaCopies(media);
  }
  entryCache.set(entry.id, entry);
  notifyMutation({ type: "update", entry });

  // File cleanup starts only after the row committed; failures there must not fail the save.
  if (existing) {
    void cleanupMedia(removedMedia(existing, input)).catch((error) =>
      reportError("entry:cleanupMedia", error)
    );
  }
  return entry;
}

export async function removeEntry(id: string): Promise<void> {
  const uris = await deleteEntry(id);
  await discardDraft(id).catch((error) => reportError("entry:discardDraft", error));
  await cleanupMedia(uris);
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

export async function clearAll(): Promise<void> {
  await deleteAllEntries();
  await discardAllDrafts().catch((error) => reportError("entry:discardDrafts", error));
  entryCache.clear();
  notifyMutation({ type: "clear" });
  // Checked against the database, so media a restore published after the clear is kept, and a
  // save still in flight keeps its copy.
  await deleteUnreferencedMedia(filterUnreferencedMedia);
}

export async function fetchEntry(id: string): Promise<Entry | null> {
  const cached = entryCache.get(id);
  if (cached) return cached;
  const fetched = await getEntryById(id);
  if (fetched) entryCache.set(fetched.id, fetched);
  return fetched;
}

interface TimelineFilter {
  monthTs?: number;
  dayTs?: number;
  tagId?: string;
}

function matchesFilter(entry: Entry, { monthTs, dayTs, tagId }: TimelineFilter): boolean {
  if (tagId !== undefined && !entry.tags.some((tag) => tag.id === tagId)) return false;
  if (dayTs !== undefined) {
    const start = startOfDay(dayTs);
    const end = addDays(start, 1);
    return entry.createdAt >= start && entry.createdAt < end;
  }
  if (monthTs !== undefined) {
    const start = startOfMonth(monthTs);
    const end = addMonths(monthTs, 1);
    return entry.createdAt >= start && entry.createdAt < end;
  }
  return true;
}

export interface UseTimelineEntriesOptions extends TimelineFilter {
  pageSize?: number;
}

/**
 * Reactive paginated entry hook for the timeline.
 * Fetches page 1 on mount, supports non-blocking cursor prefetching, and
 * updates in-memory items automatically on mutations.
 */
export function useTimelineEntries(options: UseTimelineEntriesOptions = {}) {
  const { monthTs, dayTs, tagId, pageSize = 50 } = options;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const nextCursorRef = useRef<EntryCursor | undefined>(undefined);
  const isFetchingMoreRef = useRef(false);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  // Bumped by every first-page load so an in-flight older page can't append onto the new list.
  const generationRef = useRef(0);

  const loadInitial = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    // A page requested from the previous list's cursor must not land on the new one.
    nextCursorRef.current = undefined;
    setIsLoading(true);
    try {
      const res = await getPagedEntries({ monthTs, dayTs, tagId, limit: pageSize });
      if (generationRef.current !== generation) return;
      for (const item of res.entries) {
        entryCache.set(item.id, item);
      }
      setEntries(res.entries);
      setHasMore(res.hasMore);
      nextCursorRef.current = res.nextCursor;
    } finally {
      if (generationRef.current === generation) setIsLoading(false);
    }
  }, [monthTs, dayTs, tagId, pageSize]);

  const loadInitialRef = useRef(loadInitial);
  loadInitialRef.current = loadInitial;

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetchingMoreRef.current || !nextCursorRef.current) {
      return;
    }
    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);
    const generation = generationRef.current;

    try {
      const res = await getPagedEntries({
        cursor: nextCursorRef.current,
        monthTs,
        dayTs,
        tagId,
        limit: pageSize,
      });
      if (generationRef.current !== generation) return;

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
  }, [hasMore, monthTs, dayTs, tagId, pageSize]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  // Subscribe to real-time mutations
  useEffect(() => {
    return subscribeMutations((mutation) => {
      if (mutation.type === "clear") {
        generationRef.current += 1;
        setEntries([]);
        setIsLoading(false);
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
        const { entry } = mutation;
        const listed = entriesRef.current.some((e) => e.id === entry.id);
        const matches = matchesFilter(entry, { monthTs, dayTs, tagId });
        if (listed && !matches) {
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        } else if (listed) {
          setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
        } else if (matches && tagId !== undefined) {
          // An entry that gained this tag may sort below the loaded pages; a reload
          // keeps the keyset cursor from returning it twice.
          void loadInitialRef.current();
        }
        return;
      }

      if (mutation.type === "add") {
        if (matchesFilter(mutation.entry, { monthTs, dayTs, tagId })) {
          setEntries((prev) => {
            const next = [mutation.entry, ...prev.filter((e) => e.id !== mutation.entry.id)];
            return next.sort((a, b) => b.createdAt - a.createdAt);
          });
        }
      }
    });
  }, [monthTs, dayTs, tagId]);

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
