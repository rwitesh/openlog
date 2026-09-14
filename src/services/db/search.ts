import type { EntrySearchResult } from "@/shared/types";
import { logDevWarning } from "@/shared/utils/devLog";
import { runDb } from "./database";
import { type EntryRecord, getTagsByEntryIds, toEntry } from "./entries";

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

/** Searches entry text, locations, and attached tags. */
export async function searchEntries(
  query: string,
  limit: number = DEFAULT_LIMIT
): Promise<EntrySearchResult[]> {
  const match = toFtsMatchQuery(query);
  if (!match || query.trim().length < MIN_QUERY_LENGTH) return [];
  const tagQuery = query.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");

  return runDb(async (db) => {
    let textMatches: SearchRecord[] = [];
    try {
      textMatches = await db.getAllAsync<SearchRecord>(
        `SELECT e.id, e.created_at, e.updated_at, e.text, e.images, e.audios, e.attachments,
                e.latitude, e.longitude, e.location,
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
    } catch (error) {
      // A failed FTS query must not hide otherwise valid tag matches.
      logDevWarning("db:searchEntries:fts", error);
    }

    let tagMatches: SearchRecord[] = [];
    try {
      tagMatches = await db.getAllAsync<SearchRecord>(
        `SELECT e.id, e.created_at, e.updated_at, e.text, e.images, e.audios, e.attachments,
                e.latitude, e.longitude, e.location, NULL AS text_snippet, NULL AS location_snippet
           FROM entries e
           JOIN entry_tags et ON et.entry_id = e.id
           JOIN tags t ON t.id = et.tag_id
          WHERE instr(t.key, ?) = 1
          ORDER BY e.created_at DESC, e.id DESC
          LIMIT ?`,
        tagQuery,
        limit
      );
    } catch (error) {
      logDevWarning("db:searchEntries:tags", error);
    }

    try {
      const rows: SearchRecord[] = [];
      const textMatchesById = new Map(textMatches.map((row) => [row.id, row]));
      const seen = new Set<string>();
      // Tag matches take precedence so a full text result page cannot crowd out
      // entries found solely through a tag. Keep FTS snippets for overlaps.
      for (const tagMatch of tagMatches) {
        if (seen.has(tagMatch.id)) continue;
        seen.add(tagMatch.id);
        rows.push(textMatchesById.get(tagMatch.id) ?? tagMatch);
        if (rows.length === limit) break;
      }
      for (const row of textMatches) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        rows.push(row);
        if (rows.length === limit) break;
      }

      const tagsByEntryId = await getTagsByEntryIds(
        db,
        rows.map((row) => row.id)
      );
      return rows.map((row) => ({
        entry: toEntry(row, tagsByEntryId.get(row.id)),
        snippet: row.text ? (row.text_snippet ?? "") : "",
        locationSnippet: row.location ? (row.location_snippet ?? "") : "",
      }));
    } catch (error) {
      logDevWarning("db:searchEntries", error);
      return [];
    }
  });
}
