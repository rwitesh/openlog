import { runDb } from "./database";
import { parseUris } from "./uris";
import type { Entry, EntryLocation, EntryType, NewEntryInput } from "@/types/entry";

interface EntryRecord {
  id: string;
  type: EntryType;
  created_at: number;
  text: string | null;
  uri: string | null;
  uris: string | null;
  duration_ms: number | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
}

const ENTRY_COLUMNS =
  "id, type, created_at, text, uri, uris, duration_ms, latitude, longitude, location_name";

function parseLocation(row: EntryRecord): EntryLocation | undefined {
  if (row.latitude == null || row.longitude == null) return undefined;
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    name: row.location_name ?? undefined,
  };
}

function toEntry(row: EntryRecord): Entry {
  const base = {
    id: row.id,
    createdAt: row.created_at,
    location: parseLocation(row),
  };

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

function locationParams(location?: EntryLocation) {
  return [
    location?.latitude ?? null,
    location?.longitude ?? null,
    location?.name ?? null,
  ] as const;
}

/** All entries, newest first. */
export async function getEntries(): Promise<Entry[]> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<EntryRecord>(
      `SELECT ${ENTRY_COLUMNS}
         FROM entries
        ORDER BY created_at DESC`
    );
    return rows.map(toEntry);
  });
}

export type { NewEntryInput };

/** Inserts a new entry and returns the created record. */
export async function createEntry(input: NewEntryInput): Promise<Entry> {
  return runDb(async (db) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const createdAt = input.createdAt ?? Date.now();
    const [lat, lng, locationName] = locationParams(input.location);

    switch (input.type) {
      case "text":
        await db.runAsync(
          `INSERT INTO entries (
             id, type, created_at, text, uri, uris, duration_ms,
             latitude, longitude, location_name
           ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
          id,
          input.type,
          createdAt,
          input.text,
          lat,
          lng,
          locationName
        );
        return {
          id,
          type: "text",
          createdAt,
          text: input.text,
          location: input.location,
        };

      case "image":
        await db.runAsync(
          `INSERT INTO entries (
             id, type, created_at, text, uri, uris, duration_ms,
             latitude, longitude, location_name
           ) VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?)`,
          id,
          input.type,
          createdAt,
          input.text ?? null,
          JSON.stringify(input.uris),
          lat,
          lng,
          locationName
        );
        return {
          id,
          type: "image",
          createdAt,
          text: input.text,
          uris: input.uris,
          location: input.location,
        };

      case "audio":
        await db.runAsync(
          `INSERT INTO entries (
             id, type, created_at, text, uri, uris, duration_ms,
             latitude, longitude, location_name
           ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
          id,
          input.type,
          createdAt,
          input.text ?? null,
          input.uri,
          input.durationMs ?? null,
          lat,
          lng,
          locationName
        );
        return {
          id,
          type: "audio",
          createdAt,
          text: input.text,
          uri: input.uri,
          durationMs: input.durationMs,
          location: input.location,
        };
    }
  });
}

/** Removes one image from an image entry. Deletes the entry if it was the last image and has no text. */
export async function removeImageFromEntry(
  id: string,
  imageIndex: number
): Promise<{ entry: Entry | null; removedUri: string }> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<EntryRecord>(
      `SELECT ${ENTRY_COLUMNS} FROM entries WHERE id = ?`,
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
    const location = parseLocation(row);

    if (nextUris.length === 0) {
      const text = row.text?.trim();
      if (text) {
        await db.runAsync(`UPDATE entries SET type = ?, uris = NULL WHERE id = ?`, "text", id);
        return {
          entry: { id, type: "text", createdAt: row.created_at, text, location },
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
        location,
      },
      removedUri,
    };
  });
}

export async function deleteEntry(id: string): Promise<string[]> {
  return runDb(async (db) => {
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
  });
}

/** Removes every entry and returns the file URIs that should be deleted on disk. */
export async function deleteAllEntries(): Promise<string[]> {
  return runDb(async (db) => {
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
  });
}
