import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { deleteMedia } from "@/lib";
import { resetDatabase } from "@/db/database";
import {
  createEntry,
  deleteAllEntries,
  deleteEntry,
  getEntries,
  type NewEntryInput,
} from "@/db/entries";
import type { Entry } from "@/types/entry";

export interface EntriesContextValue {
  entries: Entry[];
  addEntry: (input: NewEntryInput) => Promise<Entry>;
  removeEntry: (id: string) => Promise<void>;
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
    const uri = await deleteEntry(id);
    if (uri) await deleteMedia(uri);
    setEntries((prev) => prev.filter((e) => e.id !== id));
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
        clearAll,
        resetDb,
      }}
    >
      {children}
    </EntriesContext.Provider>
  );
}
