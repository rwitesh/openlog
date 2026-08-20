import { resolveMediaUriList } from "@/services/media/storage";
import type { Entry, EntryLocation, NewEntryInput, UpdateEntryInput } from "@/shared/types";
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
