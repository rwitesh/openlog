import { useContext } from "react";

import { EntriesContext, type EntriesContextValue } from "./EntriesProvider";

/** Access the shared timeline entry list and its mutations. */
export function useEntries(): EntriesContextValue {
  const ctx = useContext(EntriesContext);
  if (!ctx) {
    throw new Error("useEntries must be used within EntriesProvider");
  }
  return ctx;
}
