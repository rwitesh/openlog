import type * as SQLite from "expo-sqlite";
import { restoreMarkerKey } from "@/services/backup/restoreTransaction";
import { resolveMediaUri, resolveMediaUriList } from "@/services/media/storage";
import {
  type Entry,
  type EntryLocation,
  type NewEntryInput,
  TAG_COLOR_IDS,
  type Tag,
  type UpdateEntryInput,
} from "@/shared/types";
import { addMonths, startOfDay, startOfMonth } from "@/shared/utils/dates";
import { runDb } from "./database";
import {
  buildPagedEntryQuery,
  type EntryCursor,
  type PagedEntriesOptions,
} from "./entryPagination";
import { MAX_TAGS_PER_ENTRY } from "./tags";
import { parseAttachments, parseUris } from "./uris";

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

/** Maps a database row onto the app-side {@link Entry} shape with resolved media URIs. */
export function toEntry(row: EntryRecord, tags: Tag[] = []): Entry {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    text: row.text ?? undefined,
    images: row.images ? resolveMediaUriList(parseUris(row.images)) : [],
    audios: row.audios ? resolveMediaUriList(parseUris(row.audios)) : [],
    attachments: row.attachments
      ? parseAttachments(row.attachments).map((attachment) => ({
          ...attachment,
          uri: resolveMediaUri(attachment.uri),
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

export type { EntryCursor, PagedEntriesOptions } from "./entryPagination";

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
      images,
      audios,
      attachments: input.attachments ?? [],
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

export async function deleteEntry(id: string): Promise<string[]> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<{
      images: string | null;
      audios: string | null;
      attachments: string | null;
    }>(`SELECT images, audios, attachments FROM entries WHERE id = ?`, id);
    await db.runAsync(`DELETE FROM entries WHERE id = ?`, id);

    if (!row) return [];
    const mediaUris: string[] = [];
    if (row.images) mediaUris.push(...parseUris(row.images));
    if (row.audios) mediaUris.push(...parseUris(row.audios));
    if (row.attachments)
      mediaUris.push(...parseAttachments(row.attachments).map((attachment) => attachment.uri));
    return mediaUris;
  });
}

/** Removes every entry and returns the file URIs that should be deleted on disk. */
export async function deleteAllEntries(): Promise<string[]> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<{
      images: string | null;
      audios: string | null;
      attachments: string | null;
    }>(`SELECT images, audios, attachments FROM entries`);

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM entries`);
      await db.runAsync(`DELETE FROM tags`);
    });

    const mediaUris: string[] = [];
    for (const row of rows) {
      if (row.images) mediaUris.push(...parseUris(row.images));
      if (row.audios) mediaUris.push(...parseUris(row.audios));
      if (row.attachments)
        mediaUris.push(...parseAttachments(row.attachments).map((attachment) => attachment.uri));
    }
    return mediaUris;
  });
}

/** Returns the total count of entries stored in the database. */
export async function getEntriesCount(): Promise<number> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM entries`);
    return row?.count ?? 0;
  });
}

/** Maps a database row to an entry, keeping media paths as stored in SQLite (for backup). */
function toStoredEntry(row: EntryRecord, tags: Tag[] = []): Entry {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    text: row.text ?? undefined,
    images: row.images ? parseUris(row.images) : [],
    audios: row.audios ? parseUris(row.audios) : [],
    attachments: row.attachments ? parseAttachments(row.attachments) : [],
    tags,
    location: parseLocation(row),
  };
}

/** Offset/limit page of entries with stored media paths, for backup export. */
export async function getEntriesPage(offset: number, limit: number): Promise<Entry[]> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<EntryRecord>(
      `SELECT ${ENTRY_COLUMNS} FROM entries ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const tagsByEntryId = await getTagsByEntryIds(
      db,
      rows.map((row) => row.id)
    );
    return rows.map((row) => toStoredEntry(row, tagsByEntryId.get(row.id)));
  });
}

/** Replaces all entries in a single transaction (restore from backup). */
export async function importEntriesBatched(
  entries: Iterable<Entry> | AsyncIterable<Entry>,
  options?: {
    signal?: AbortSignal;
    expectedCounts?: { entry: number; images: number; audio: number; attachments: number };
    restoreTransactionId?: string;
  }
): Promise<number> {
  return runDb(async (db) => {
    let inserted = 0;
    const counts = { images: 0, audio: 0, attachments: 0 };

    await db.withTransactionAsync(async () => {
      if (options?.signal?.aborted) {
        throw new Error("Import cancelled");
      }

      await db.runAsync(`DELETE FROM entries`);
      await db.runAsync(`DELETE FROM tags`);
      const insertStmt = await db.prepareAsync(
        `INSERT INTO entries (
           id, created_at, updated_at, text, images, audios, attachments,
           latitude, longitude, location
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      try {
        for await (const entry of entries) {
          if (options?.signal?.aborted) {
            throw new Error("Import cancelled");
          }
          const [lat, lng, locationName] = locationParams(entry.location);
          const imagesJson = entry.images?.length ? JSON.stringify(entry.images) : null;
          const audiosJson = entry.audios?.length ? JSON.stringify(entry.audios) : null;
          const filesJson = entry.attachments?.length ? JSON.stringify(entry.attachments) : null;
          const text = entry.text ?? null;
          const createdAt = entry.createdAt;
          const updatedAt = entry.updatedAt ?? createdAt;

          const entryTags = entry.tags ?? [];
          if (
            typeof entry.id !== "string" ||
            !Number.isFinite(createdAt) ||
            !Number.isFinite(updatedAt) ||
            (entry.text !== undefined && typeof entry.text !== "string") ||
            !Array.isArray(entry.images) ||
            !Array.isArray(entry.audios) ||
            !Array.isArray(entry.attachments) ||
            !Array.isArray(entryTags) ||
            entryTags.length > MAX_TAGS_PER_ENTRY
          ) {
            throw new Error("Invalid backup entry.");
          }

          await insertStmt.executeAsync([
            entry.id,
            createdAt,
            updatedAt,
            text,
            imagesJson,
            audiosJson,
            filesJson,
            lat,
            lng,
            locationName,
          ]);
          const restoredTagIds: string[] = [];
          for (const tag of entryTags) {
            const normalizedName = tag?.name?.normalize("NFKC").trim().replace(/\s+/g, " ");
            if (
              !tag ||
              typeof tag.id !== "string" ||
              !normalizedName ||
              [...normalizedName].length > 10 ||
              !TAG_COLOR_IDS.includes(tag.colorId)
            ) {
              throw new Error("Invalid backup tag.");
            }
            const key = normalizedName.toLocaleLowerCase("en-US");
            const existingTag = await db.getFirstAsync<{ id: string }>(
              "SELECT id FROM tags WHERE key = ?",
              key
            );
            const tagId = existingTag?.id ?? tag.id;
            if (!existingTag) {
              await db.runAsync(
                "INSERT INTO tags (id, name, key, color_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                [tagId, normalizedName, key, tag.colorId, createdAt, updatedAt]
              );
            }
            restoredTagIds.push(tagId);
          }
          await replaceEntryTags(db, entry.id, tagIds(restoredTagIds));
          inserted++;
          counts.images += entry.images.length;
          counts.audio += entry.audios.length;
          counts.attachments += entry.attachments.length;
        }

        if (
          options?.expectedCounts &&
          (inserted !== options.expectedCounts.entry ||
            counts.images !== options.expectedCounts.images ||
            counts.audio !== options.expectedCounts.audio ||
            counts.attachments !== options.expectedCounts.attachments)
        ) {
          throw new Error("Backup data does not match the manifest counts.");
        }

        if (options?.restoreTransactionId) {
          await db.runAsync(
            `INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            [restoreMarkerKey, options.restoreTransactionId]
          );
        }
      } finally {
        await insertStmt.finalizeAsync();
      }
    });

    return inserted;
  });
}
