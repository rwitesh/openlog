import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { deleteMedia, deleteMediaList } from "@/lib";
import { resetDatabase } from "@/db/database";
import {
  createEntry,
  deleteAllEntries,
  deleteEntry,
  getEntries,
  removeImageFromEntry,
  type NewEntryInput,
} from "@/db/entries";
import type { Entry } from "@/types/entry";

export interface EntriesContextValue {
  entries: Entry[];
  addEntry: (input: NewEntryInput) => Promise<Entry>;
  removeEntry: (id: string) => Promise<void>;
  removeImage: (entryId: string, imageIndex: number) => Promise<Entry | null>;
  clearAll: () => Promise<string[]>;
  /** Drops and recreates the database schema; returns media URIs to delete. */
  resetDb: () => Promise<string[]>;
}

export const EntriesContext = createContext<EntriesContextValue | null>(null);

/** Single source of truth for timeline entries. */
export function EntriesProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    getEntries().then(setEntries);
  }, []);

  const addEntry = useCallback(async (input: NewEntryInput) => {
    const entry = await createEntry(input);
    setEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    const uris = await deleteEntry(id);
    await deleteMediaList(uris);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const removeImage = useCallback(async (entryId: string, imageIndex: number) => {
    const { entry, removedUri } = await removeImageFromEntry(entryId, imageIndex);
    await deleteMedia(removedUri);
    setEntries((prev) => {
      if (entry === null) return prev.filter((e) => e.id !== entryId);
      return prev.map((e) => (e.id === entryId ? entry : e));
    });
    return entry;
  }, []);

  const clearAll = useCallback(async (): Promise<string[]> => {
    const uris = await deleteAllEntries();
    setEntries([]);
    return uris;
  }, []);

  const resetDb = useCallback(async (): Promise<string[]> => {
    const uris = await resetDatabase();
    setEntries([]);
    return uris;
  }, []);

  return (
    <EntriesContext.Provider
      value={{
        entries,
        addEntry,
        removeEntry,
        removeImage,
        clearAll,
        resetDb,
      }}
    >
      {children}
    </EntriesContext.Provider>
  );
}
