import { getDatabase } from "./database";
import { parseUris } from "./uris";
import type { Entry, EntryType, NewEntryInput } from "@/types/entry";

interface EntryRecord {
  id: string;
  type: EntryType;
  created_at: number;
  text: string | null;
  uri: string | null;
  uris: string | null;
  duration_ms: number | null;
}

function toEntry(row: EntryRecord): Entry {
  const base = { id: row.id, createdAt: row.created_at };

  switch (row.type) {
    case "text":
      return { ...base, type: "text", text: row.text ?? "" };
    case "image":
      return {
        ...base,
        type: "image",
        text: row.text ?? undefined,
        uris: row.uris ? parseUris(row.uris) : [],
      };
    case "audio":
      return {
        ...base,
        type: "audio",
        text: row.text ?? undefined,
        uri: row.uri ?? "",
        durationMs: row.duration_ms ?? undefined,
      };
  }
}

/** All entries, newest first. */
export async function getEntries(): Promise<Entry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EntryRecord>(
    `SELECT id, type, created_at, text, uri, uris, duration_ms
       FROM entries
      ORDER BY created_at DESC`
  );

  return rows.map(toEntry);
}

export type { NewEntryInput };

/** Inserts a new entry and returns the created record. */
export async function createEntry(input: NewEntryInput): Promise<Entry> {
  const db = await getDatabase();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createdAt = input.createdAt ?? Date.now();

  switch (input.type) {
    case "text":
      await db.runAsync(
        `INSERT INTO entries (id, type, created_at, text, uri, uris, duration_ms)
         VALUES (?, ?, ?, ?, NULL, NULL, NULL)`,
        id,
        input.type,
        createdAt,
        input.text
      );
      return { id, type: "text", createdAt, text: input.text };

    case "image":
      await db.runAsync(
        `INSERT INTO entries (id, type, created_at, text, uri, uris, duration_ms)
         VALUES (?, ?, ?, ?, NULL, ?, NULL)`,
        id,
        input.type,
        createdAt,
        input.text ?? null,
        JSON.stringify(input.uris)
      );
      return {
        id,
        type: "image",
        createdAt,
        text: input.text,
        uris: input.uris,
      };

    case "audio":
      await db.runAsync(
        `INSERT INTO entries (id, type, created_at, text, uri, uris, duration_ms)
         VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        id,
        input.type,
        createdAt,
        input.text ?? null,
        input.uri,
        input.durationMs ?? null
      );
      return {
        id,
        type: "audio",
        createdAt,
        text: input.text,
        uri: input.uri,
        durationMs: input.durationMs,
      };
  }
}

/** Removes one image from an image entry. Deletes the entry if it was the last image and has no text. */
export async function removeImageFromEntry(
  id: string,
  imageIndex: number
): Promise<{ entry: Entry | null; removedUri: string }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<EntryRecord>(
    `SELECT id, type, created_at, text, uri, uris, duration_ms FROM entries WHERE id = ?`,
    id
  );

  if (!row || row.type !== "image" || !row.uris) {
    throw new Error("Entry is not an image entry");
  }

  const uris = parseUris(row.uris);
  if (imageIndex < 0 || imageIndex >= uris.length) {
    throw new Error("Image index out of range");
  }

  const removedUri = uris[imageIndex];
  const nextUris = uris.filter((_, i) => i !== imageIndex);

  if (nextUris.length === 0) {
    const text = row.text?.trim();
    if (text) {
      await db.runAsync(`UPDATE entries SET type = ?, uris = NULL WHERE id = ?`, "text", id);
      return {
        entry: { id, type: "text", createdAt: row.created_at, text },
        removedUri,
      };
    }

    await db.runAsync(`DELETE FROM entries WHERE id = ?`, id);
    return { entry: null, removedUri };
  }

  await db.runAsync(`UPDATE entries SET uris = ? WHERE id = ?`, JSON.stringify(nextUris), id);
  return {
    entry: {
      id,
      type: "image",
      createdAt: row.created_at,
      text: row.text ?? undefined,
      uris: nextUris,
    },
    removedUri,
  };
}

export async function deleteEntry(id: string): Promise<string[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    type: EntryType;
    uri: string | null;
    uris: string | null;
  }>(`SELECT type, uri, uris FROM entries WHERE id = ?`, id);
  await db.runAsync(`DELETE FROM entries WHERE id = ?`, id);

  if (!row) return [];
  if (row.type === "audio" && row.uri) return [row.uri];
  if (row.type === "image" && row.uris) return parseUris(row.uris);
  return [];
}

/** Removes every entry and returns the file URIs that should be deleted on disk. */
export async function deleteAllEntries(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    type: EntryType;
    uri: string | null;
    uris: string | null;
  }>(`SELECT type, uri, uris FROM entries`);

  await db.runAsync(`DELETE FROM entries`);

  const mediaUris: string[] = [];
  for (const row of rows) {
    if (row.type === "audio" && row.uri) {
      mediaUris.push(row.uri);
    } else if (row.type === "image" && row.uris) {
      mediaUris.push(...parseUris(row.uris));
    }
  }
  return mediaUris;
}
