import type { EntrySearchResult } from "@/shared/types";
import { logDevWarning } from "@/shared/utils/devLog";
import { runDb } from "./database";
import { type EntryRecord, toEntry } from "./entries";

/** Match markers embedded in snippets by the SQL below; the UI splits on them to highlight. */
export const SNIPPET_MARK_START = "\u0001";
export const SNIPPET_MARK_END = "\u0002";

const MIN_QUERY_LENGTH = 2;
const SNIPPET_WORDS = 14;
const DEFAULT_LIMIT = 50;

interface SearchRecord extends EntryRecord {
  text_snippet: string | null;
  location_snippet: string | null;
}

/**
 * Transforms raw input into a safe FTS5 MATCH expression: every whitespace
 * token becomes a quoted prefix phrase (`"coffe"*`), so typing "tok" matches
 * "Tokyo" and punctuation is never parsed as FTS query syntax.
 */
export function toFtsMatchQuery(input: string): string | null {
  const tokens = input
    .replace(/"/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token}"*`);

  return tokens.length ? tokens.join(" ") : null;
}

/** Full-text search across entry text and location names, best matches first. */
export async function searchEntries(
  query: string,
  limit: number = DEFAULT_LIMIT
): Promise<EntrySearchResult[]> {
  const match = toFtsMatchQuery(query);
  if (!match || query.trim().length < MIN_QUERY_LENGTH) return [];

  return runDb(async (db) => {
    try {
      const rows = await db.getAllAsync<SearchRecord>(
        `SELECT e.id, e.created_at, e.updated_at, e.text, e.images, e.audios, e.attachments,
                e.latitude, e.longitude, e.location_name,
                snippet(entries_fts, 0, char(1), char(2), '…', ${SNIPPET_WORDS}) AS text_snippet,
                snippet(entries_fts, 1, char(1), char(2), '…', ${SNIPPET_WORDS}) AS location_snippet
           FROM entries_fts
           JOIN entries e ON e.rowid = entries_fts.rowid
          WHERE entries_fts MATCH ?
          ORDER BY entries_fts.rank
          LIMIT ?`,
        match,
        limit
      );

      return rows.map((row) => ({
        entry: toEntry(row),
        snippet: row.text ? (row.text_snippet ?? "") : "",
        locationSnippet: row.location_name ? (row.location_snippet ?? "") : "",
      }));
    } catch (error) {
      // Defensive: a malformed MATCH expression must never crash the timeline.
      logDevWarning("db:searchEntries", error);
      return [];
    }
  });
}
