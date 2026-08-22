import { resolveMediaUriList } from "@/services/media/storage";
import type { Entry, EntryLocation, NewEntryInput, UpdateEntryInput } from "@/shared/types";
import { IS_EXPO_GO } from "@/shared/utils/appInfo";
import { addDays, addMonths, startOfDay, startOfMonth } from "@/shared/utils/dates";
import { runDb } from "./database";
import { parseUris } from "./uris";

export interface EntryRecord {
  id: string;
  created_at: number;
  updated_at: number;
  text: string | null;
  images: string | null;
  audios: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
}

const ENTRY_COLUMNS =
  "id, created_at, updated_at, text, images, audios, latitude, longitude, location_name";

function parseLocation(row: EntryRecord): EntryLocation | undefined {
  if (row.latitude == null || row.longitude == null) return undefined;
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    name: row.location_name ?? undefined,
  };
}

/** Maps a raw `entries` row onto the app-side {@link Entry} shape. */
export function toEntry(row: EntryRecord): Entry {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    text: row.text ?? undefined,
    images: row.images ? resolveMediaUriList(parseUris(row.images)) : [],
    audios: row.audios ? resolveMediaUriList(parseUris(row.audios)) : [],
    location: parseLocation(row),
  };
}

function locationParams(location?: EntryLocation | null) {
  return [location?.latitude ?? null, location?.longitude ?? null, location?.name ?? null] as const;
}

export interface PagedEntriesOptions {
  cursor?: number;
  monthTs?: number;
  dayTs?: number;
  limit?: number;
}

export interface PagedEntriesResult {
  entries: Entry[];
  nextCursor?: number;
  hasMore: boolean;
}

/** Cursor-paginated entries with prefetch support. */
export async function getPagedEntries(
  options: PagedEntriesOptions = {}
): Promise<PagedEntriesResult> {
  const { cursor, monthTs, dayTs, limit = 50 } = options;
  return runDb(async (db) => {
    const conditions: string[] = [];
    const params: (number | string)[] = [];

    if (cursor !== undefined) {
      conditions.push("created_at < ?");
      params.push(cursor);
    }

    if (dayTs !== undefined) {
      const start = startOfDay(dayTs);
      const end = addDays(start, 1);
      conditions.push("created_at >= ? AND created_at < ?");
      params.push(start, end);
    } else if (monthTs !== undefined) {
      const start = startOfMonth(monthTs);
      const end = addMonths(monthTs, 1);
      conditions.push("created_at >= ? AND created_at < ?");
      params.push(start, end);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT ${ENTRY_COLUMNS}
        FROM entries
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ?
    `;
    params.push(limit + 1);

    const rows = await db.getAllAsync<EntryRecord>(query, ...params);
    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;
    const entries = resultRows.map(toEntry);
    const nextCursor = entries.length > 0 ? entries[entries.length - 1].createdAt : undefined;

    return {
      entries,
      nextCursor: hasMore ? nextCursor : undefined,
      hasMore,
    };
  });
}

/** Single entry lookup by ID from SQLite. */
export async function getEntryById(id: string): Promise<Entry | null> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<EntryRecord>(
      `SELECT ${ENTRY_COLUMNS} FROM entries WHERE id = ?`,
      id
    );
    return row ? toEntry(row) : null;
  });
}

/** Lightweight timestamp scan to highlight active days in a month without loading full entries. */
export async function getEntryDaysForMonth(monthTs: number): Promise<Set<number>> {
  const start = startOfMonth(monthTs);
  const end = addMonths(monthTs, 1);
  return runDb(async (db) => {
    const rows = await db.getAllAsync<{ created_at: number }>(
      `SELECT created_at FROM entries WHERE created_at >= ? AND created_at < ?`,
      start,
      end
    );
    const days = new Set<number>();
    for (const row of rows) {
      days.add(startOfDay(row.created_at));
    }
    return days;
  });
}

/** Distinct months that have at least one entry, for the month picker. */
export async function getDistinctEntryMonths(): Promise<Set<number>> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<{ created_at: number }>(
      `SELECT DISTINCT created_at FROM entries ORDER BY created_at DESC`
    );
    const months = new Set<number>();
    for (const row of rows) {
      months.add(startOfMonth(row.created_at));
    }
    return months;
  });
}

/** All entries in a given month. */
export async function getEntriesForMonth(monthTs: number): Promise<Entry[]> {
  const start = startOfMonth(monthTs);
  const end = addMonths(monthTs, 1);
  return runDb(async (db) => {
    const rows = await db.getAllAsync<EntryRecord>(
      `SELECT ${ENTRY_COLUMNS}
         FROM entries
        WHERE created_at >= ? AND created_at < ?
        ORDER BY created_at DESC`,
      start,
      end
    );
    return rows.map(toEntry);
  });
}

/** All entries (bounded optionally by limit), newest first. */
export async function getEntries(limit?: number): Promise<Entry[]> {
  return runDb(async (db) => {
    const query = limit
      ? `SELECT ${ENTRY_COLUMNS} FROM entries ORDER BY created_at DESC LIMIT ?`
      : `SELECT ${ENTRY_COLUMNS} FROM entries ORDER BY created_at DESC`;
    const rows = limit
      ? await db.getAllAsync<EntryRecord>(query, limit)
      : await db.getAllAsync<EntryRecord>(query);
    return rows.map(toEntry);
  });
}

export type { NewEntryInput, UpdateEntryInput };

/** Inserts a new entry and returns the created record. */
export async function createEntry(input: NewEntryInput): Promise<Entry> {
  return runDb(async (db) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const createdAt = input.createdAt ?? Date.now();
    const updatedAt = createdAt;
    const [lat, lng, locationName] = locationParams(input.location);
    const images = input.images?.length ? input.images : [];
    const audios = input.audios?.length ? input.audios : [];

    await db.runAsync(
      `INSERT INTO entries (
         id, created_at, updated_at, text, images, audios,
         latitude, longitude, location_name
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      updatedAt,
      input.text ?? null,
      images.length ? JSON.stringify(images) : null,
      audios.length ? JSON.stringify(audios) : null,
      lat,
      lng,
      locationName
    );

    return {
      id,
      createdAt,
      updatedAt,
      text: input.text,
      images,
      audios,
      location: input.location ?? undefined,
    };
  });
}

/** Updates fields on an existing entry. */
export async function updateEntry(id: string, input: UpdateEntryInput): Promise<Entry> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<EntryRecord>(
      `SELECT ${ENTRY_COLUMNS} FROM entries WHERE id = ?`,
      id
    );

    if (!row) {
      throw new Error("Entry not found");
    }

    const updatedAt = Date.now();
    const createdAt = input.createdAt ?? row.created_at;
    const text = input.text !== undefined ? input.text || null : row.text;
    const [lat, lng, locationName] =
      input.location !== undefined
        ? locationParams(input.location)
        : ([row.latitude, row.longitude, row.location_name] as const);

    const imagesJson =
      input.images !== undefined
        ? input.images.length
          ? JSON.stringify(input.images)
          : null
        : row.images;

    const audiosJson =
      input.audios !== undefined
        ? input.audios.length
          ? JSON.stringify(input.audios)
          : null
        : row.audios;

    await db.runAsync(
      `UPDATE entries
          SET created_at = ?,
              updated_at = ?,
              text = ?,
              images = ?,
              audios = ?,
              latitude = ?,
              longitude = ?,
              location_name = ?
        WHERE id = ?`,
      createdAt,
      updatedAt,
      text,
      imagesJson,
      audiosJson,
      lat,
      lng,
      locationName,
      id
    );

    return toEntry({
      id,
      created_at: createdAt,
      updated_at: updatedAt,
      text,
      images: imagesJson,
      audios: audiosJson,
      latitude: lat,
      longitude: lng,
      location_name: locationName,
    });
  });
}

export async function deleteEntry(id: string): Promise<string[]> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<{
      images: string | null;
      audios: string | null;
    }>(`SELECT images, audios FROM entries WHERE id = ?`, id);
    await db.runAsync(`DELETE FROM entries WHERE id = ?`, id);

    if (!row) return [];
    const mediaUris: string[] = [];
    if (row.images) mediaUris.push(...parseUris(row.images));
    if (row.audios) mediaUris.push(...parseUris(row.audios));
    return mediaUris;
  });
}

/** Removes every entry and returns the file URIs that should be deleted on disk. */
export async function deleteAllEntries(): Promise<string[]> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<{
      images: string | null;
      audios: string | null;
    }>(`SELECT images, audios FROM entries`);

    await db.runAsync(`DELETE FROM entries`);

    const mediaUris: string[] = [];
    for (const row of rows) {
      if (row.images) mediaUris.push(...parseUris(row.images));
      if (row.audios) mediaUris.push(...parseUris(row.audios));
    }
    return mediaUris;
  });
}

/** Generates realistic mock entries in a single high-speed SQLite transaction for performance testing (Expo Go only). */
export async function seedMockEntries(count: number = 1000): Promise<void> {
  if (!IS_EXPO_GO) {
    return;
  }
  return runDb(async (db) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const sampleSentences = [
      "Morning coffee in Tokyo and quiet thoughts on architecture.",
      "Walking through the rainy streets, listening to ambient music.",
      "Captured a fleeting idea about memory anchors.",
      "Met an old friend at the bakery. Discussed typography and minimalism.",
      "Late night recording session. The rain outside is soothing.",
      "Reflecting on today's progress. Simple code is best.",
      "Sunrise hike through the hills. Clear skies and fresh air.",
      "Quick memo: simplify data structures before adding features.",
      "Quiet evening reading beside the window.",
      "Explored the old library downtown.",
    ];
    const sampleLocations = [
      "Tokyo, Japan",
      "Brooklyn, NY",
      "Kyoto",
      "Berlin",
      "San Francisco",
      "London",
      "Paris",
      "Zurich",
    ];

    await db.withTransactionAsync(async () => {
      for (let i = 0; i < count; i++) {
        const offset = Math.floor((i / count) * 365 * dayMs + Math.random() * dayMs);
        const createdAt = now - offset;
        const text = sampleSentences[i % sampleSentences.length];
        const locationName = sampleLocations[i % sampleLocations.length];
        const id = `mock-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        await db.runAsync(
          `INSERT INTO entries (id, created_at, updated_at, text, images, audios, latitude, longitude, location_name)
           VALUES (?, ?, ?, ?, NULL, NULL, 35.6762, 139.6503, ?)`,
          id,
          createdAt,
          createdAt,
          text,
          locationName
        );
      }
    });
  });
}
