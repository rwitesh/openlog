import { useCallback, useEffect, useRef, useState } from "react";

import { searchEntries } from "@/services/db/search";
import { useDebouncedCallback } from "@/shared/hooks";
import type { EntrySearchResult } from "@/shared/types";

const DEBOUNCE_MS = 180;
const MIN_QUERY_LENGTH = 2;

/**
 * Debounced full-text search over entries. Stale responses are ignored so
 * rapid typing always settles on the latest query's results.
 */
export function useEntrySearch() {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<EntrySearchResult[]>([]);
  // The query `results` answer; it lags `query` by the debounce.
  const [resultsQuery, setResultsQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  const runSearch = useDebouncedCallback((nextQuery: string) => {
    const id = requestId.current + 1;
    requestId.current = id;

    if (nextQuery.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setResultsQuery("");
      setSearching(false);
      return;
    }

    setSearching(true);
    searchEntries(nextQuery)
      .then((nextResults) => {
        if (requestId.current !== id) return;
        setResults(nextResults);
        setResultsQuery(nextQuery);
      })
      .catch(() => {
        if (requestId.current !== id) return;
        setResults([]);
      })
      .finally(() => {
        if (requestId.current === id) setSearching(false);
      });
  }, DEBOUNCE_MS);

  useEffect(() => {
    requestId.current += 1;
    setSearching(false);
  }, []);

  const setQuery = useCallback(
    (nextQuery: string) => {
      setQueryState(nextQuery);
      runSearch(nextQuery);
    },
    [runSearch]
  );

  return { query, setQuery, results, resultsQuery, searching };
}
