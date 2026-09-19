import type * as SQLite from "expo-sqlite";
import { mediaFileUri } from "@/services/media/storage";
import type { Entry, EntryLocation, NewEntryInput, Tag, UpdateEntryInput } from "@/shared/types";
import { addMonths, startOfDay, startOfMonth } from "@/shared/utils/dates";
import { runDb } from "./database";
import { buildPagedEntryQuery, type EntryCursor, type PagedEntriesOptions } from "./pagination";
import { MAX_TAGS_PER_ENTRY } from "./tags";
import { parseAttachments, parseUris } from "./uris";
import { extractMediaFilenameFromUri } from "./validation";

export interface EntryRecord {
  id: string;
  created_at: number;
  updated_at: number;
  text: string | null;
  images: string | null;
  audios: string | null;
  attachments: string | null;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
}

const ENTRY_COLUMNS =
  "id, created_at, updated_at, text, images, audios, attachments, latitude, longitude, location";

function parseLocation(row: EntryRecord): EntryLocation | undefined {
  if (row.latitude == null || row.longitude == null) return undefined;
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    name: row.location ?? undefined,
  };
}

/** Maps a database row onto the app-side {@link Entry} shape, resolving stored filenames to live file URIs. */
export function toEntry(row: EntryRecord, tags: Tag[] = []): Entry {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    text: row.text ?? undefined,
    images: row.images ? parseUris(row.images).map(mediaFileUri) : [],
    audios: row.audios ? parseUris(row.audios).map(mediaFileUri) : [],
    attachments: row.attachments
      ? parseAttachments(row.attachments).map((attachment) => ({
          ...attachment,
          uri: mediaFileUri(attachment.uri),
        }))
      : [],
    tags,
    location: parseLocation(row),
  };
}

interface EntryTagRecord {
  entry_id: string;
  id: string;
  name: string;
  color_id: Tag["colorId"];
}

export async function getTagsByEntryIds(
  db: SQLite.SQLiteDatabase,
  entryIds: string[]
): Promise<Map<string, Tag[]>> {
  const result = new Map<string, Tag[]>();
  if (!entryIds.length) return result;
  const placeholders = entryIds.map(() => "?").join(", ");
  const rows = await db.getAllAsync<EntryTagRecord>(
    `SELECT et.entry_id, t.id, t.name, t.color_id
       FROM entry_tags et
       JOIN tags t ON t.id = et.tag_id
      WHERE et.entry_id IN (${placeholders})
      ORDER BY t.name COLLATE NOCASE, t.id`,
    ...entryIds
  );
  for (const row of rows) {
    const tags = result.get(row.entry_id) ?? [];
    tags.push({ id: row.id, name: row.name, colorId: row.color_id });
    result.set(row.entry_id, tags);
  }
  return result;
}

function tagIds(input?: string[]): string[] {
  const ids = [...new Set(input ?? [])];
  if (ids.length > MAX_TAGS_PER_ENTRY) {
    throw new Error(`An entry can have at most ${MAX_TAGS_PER_ENTRY} tags.`);
  }
  return ids;
}

async function replaceEntryTags(db: SQLite.SQLiteDatabase, entryId: string, ids: string[]) {
  await db.runAsync("DELETE FROM entry_tags WHERE entry_id = ?", [entryId]);
  for (const tagId of ids) {
    await db.runAsync("INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)", [entryId, tagId]);
  }
}

function locationParams(location?: EntryLocation | null) {
  return [location?.latitude ?? null, location?.longitude ?? null, location?.name ?? null] as const;
}

export type { EntryCursor, PagedEntriesOptions } from "./pagination";

export interface PagedEntriesResult {
  entries: Entry[];
  nextCursor?: EntryCursor;
  hasMore: boolean;
}

/** Cursor-paginated entries with prefetch support. */
export async function getPagedEntries(
  options: PagedEntriesOptions = {}
): Promise<PagedEntriesResult> {
  const { limit = 50 } = options;
  return runDb(async (db) => {
    const page = buildPagedEntryQuery(ENTRY_COLUMNS, options);
    const rows = await db.getAllAsync<EntryRecord>(page.query, ...page.params, limit + 1);
    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;
    const tagsByEntryId = await getTagsByEntryIds(
      db,
      resultRows.map((row) => row.id)
    );
    const entries = resultRows.map((row) => toEntry(row, tagsByEntryId.get(row.id)));
    const last = entries[entries.length - 1];
    const nextCursor: EntryCursor | undefined =
      hasMore && last ? { createdAt: last.createdAt, id: last.id } : undefined;

    return {
      entries,
      nextCursor,
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
    if (!row) return null;
    const tagsByEntryId = await getTagsByEntryIds(db, [id]);
    return toEntry(row, tagsByEntryId.get(id));
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

/** All entries (bounded optionally by limit), newest first. */
export async function getEntries(limit?: number): Promise<Entry[]> {
  return runDb(async (db) => {
    const query = limit
      ? `SELECT ${ENTRY_COLUMNS} FROM entries ORDER BY created_at DESC, id DESC LIMIT ?`
      : `SELECT ${ENTRY_COLUMNS} FROM entries ORDER BY created_at DESC, id DESC`;
    const rows = limit
      ? await db.getAllAsync<EntryRecord>(query, limit)
      : await db.getAllAsync<EntryRecord>(query);
    const tagsByEntryId = await getTagsByEntryIds(
      db,
      rows.map((row) => row.id)
    );
    return rows.map((row) => toEntry(row, tagsByEntryId.get(row.id)));
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
    const ids = tagIds(input.tagIds);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO entries (
         id, created_at, updated_at, text, images, audios, attachments,
         latitude, longitude, location
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        createdAt,
        updatedAt,
        input.text ?? null,
        images.length ? JSON.stringify(images) : null,
        audios.length ? JSON.stringify(audios) : null,
        input.attachments?.length ? JSON.stringify(input.attachments) : null,
        lat,
        lng,
        locationName
      );
      await replaceEntryTags(db, id, ids);
    });

    const tagsByEntryId = await getTagsByEntryIds(db, [id]);

    return {
      id,
      createdAt,
      updatedAt,
      text: input.text,
      images: images.map(mediaFileUri),
      audios: audios.map(mediaFileUri),
      attachments: (input.attachments ?? []).map((attachment) => ({
        ...attachment,
        uri: mediaFileUri(attachment.uri),
      })),
      tags: tagsByEntryId.get(id) ?? [],
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
        : ([row.latitude, row.longitude, row.location] as const);

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

    const filesJson =
      input.attachments !== undefined
        ? input.attachments.length
          ? JSON.stringify(input.attachments)
          : null
        : row.attachments;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE entries
          SET created_at = ?,
              updated_at = ?,
              text = ?,
              images = ?,
              audios = ?,
              attachments = ?,
              latitude = ?,
              longitude = ?,
              location = ?
        WHERE id = ?`,
        createdAt,
        updatedAt,
        text,
        imagesJson,
        audiosJson,
        filesJson,
        lat,
        lng,
        locationName,
        id
      );
      if (input.tagIds !== undefined) {
        await replaceEntryTags(db, id, tagIds(input.tagIds));
      }
    });

    const tagsByEntryId = await getTagsByEntryIds(db, [id]);

    return toEntry(
      {
        id,
        created_at: createdAt,
        updated_at: updatedAt,
        text,
        images: imagesJson,
        audios: audiosJson,
        attachments: filesJson,
        latitude: lat,
        longitude: lng,
        location: locationName,
      },
      tagsByEntryId.get(id)
    );
  });
}

interface MediaRow {
  images: string | null;
  audios: string | null;
  attachments: string | null;
}

function extractMediaUrisFromRow(row?: MediaRow | null): string[] {
  if (!row) return [];
  const mediaUris: string[] = [];
  if (row.images) mediaUris.push(...parseUris(row.images));
  if (row.audios) mediaUris.push(...parseUris(row.audios));
  if (row.attachments) {
    mediaUris.push(...parseAttachments(row.attachments).map((attachment) => attachment.uri));
  }
  return mediaUris;
}

export async function deleteEntry(id: string): Promise<string[]> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<MediaRow>(
      `SELECT images, audios, attachments FROM entries WHERE id = ?`,
      id
    );
    await db.runAsync(`DELETE FROM entries WHERE id = ?`, id);
    return extractMediaUrisFromRow(row);
  });
}

/** Removes every entry and returns the file URIs that should be deleted on disk. */
export async function deleteAllEntries(): Promise<string[]> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<MediaRow>(`SELECT images, audios, attachments FROM entries`);

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM entries`);
      await db.runAsync(`DELETE FROM tags`);
    });

    const mediaUris: string[] = [];
    for (const row of rows) {
      mediaUris.push(...extractMediaUrisFromRow(row));
    }
    return mediaUris;
  });
}

/**
 * Normalizes media references to unreferenced filenames by checking that no entry
 * column still contains the quoted filename. Protects media shared across
 * entries, e.g. restored from a backup.
 */
export async function filterUnreferencedMedia(uris: string[]): Promise<string[]> {
  if (!uris.length) return [];

  return runDb(async (db) => {
    const unreferenced: string[] = [];
    const seen = new Set<string>();

    for (const uri of uris) {
      const filename = extractMediaFilenameFromUri(uri) ?? uri.trim();
      if (!filename || seen.has(filename)) continue;
      seen.add(filename);

      const needle = `"${filename}"`;
      const referenced = await db.getFirstAsync(
        `SELECT 1 FROM entries
          WHERE instr(images, ?) > 0
             OR instr(audios, ?) > 0
             OR instr(attachments, ?) > 0
          LIMIT 1`,
        needle,
        needle,
        needle
      );

      if (!referenced) {
        unreferenced.push(filename);
      }
    }

    return unreferenced;
  });
}
