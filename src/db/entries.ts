import { getDatabase } from "./database";
import type { Entry, EntryType } from "@/types/entry";

interface EntryRecord {
  id: string;
  type: EntryType;
  created_at: number;
  text: string | null;
  uri: string | null;
  duration_ms: number | null;
}

function toEntry(row: EntryRecord): Entry {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
    text: row.text ?? undefined,
    uri: row.uri ?? undefined,
    durationMs: row.duration_ms ?? undefined,
  };
}

/** All entries, newest first. */
export async function getEntries(): Promise<Entry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EntryRecord>(
    `SELECT id, type, created_at, text, uri, duration_ms
       FROM entries
      ORDER BY created_at DESC`
  );

  return rows.map(toEntry);
}

export interface NewEntryInput {
  type: EntryType;
  text?: string;
  uri?: string;
  durationMs?: number;
}

/** Inserts a new entry and returns the created record. */
export async function createEntry(input: NewEntryInput): Promise<Entry> {
  const db = await getDatabase();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createdAt = Date.now();

  const entry: Entry = {
    id,
    type: input.type,
    createdAt,
    text: input.text,
    uri: input.uri,
    durationMs: input.durationMs,
  };

  await db.runAsync(
    `INSERT INTO entries (id, type, created_at, text, uri, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    input.type,
    createdAt,
    input.text ?? null,
    input.uri ?? null,
    input.durationMs ?? null
  );

  return entry;
}

export async function deleteEntry(id: string): Promise<string | undefined> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ uri: string | null }>(
    `SELECT uri FROM entries WHERE id = ?`,
    id
  );
  await db.runAsync(`DELETE FROM entries WHERE id = ?`, id);
  return row?.uri ?? undefined;
}

/** Removes every entry and returns the file URIs that should be deleted on disk. */
export async function deleteAllEntries(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ uri: string | null }>(
    `SELECT uri FROM entries WHERE uri IS NOT NULL`
  );
  await db.runAsync(`DELETE FROM entries`);
  return rows.map((r) => r.uri).filter((u): u is string => Boolean(u));
}
