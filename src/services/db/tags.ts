import { TAG_COLOR_IDS, type Tag, type TagColorId, type TagSummary } from "@/shared/types";
import { runDb } from "./database";

export const MAX_TAG_NAME_LENGTH = 10;
export const MAX_TAGS_PER_ENTRY = 10;

interface TagRecord {
  id: string;
  name: string;
  color_id: TagColorId;
}

/** Thrown when a rename would collide with another tag's case-insensitive key. */
export class TagNameTakenError extends Error {
  constructor() {
    super("A tag with this name already exists.");
    this.name = "TagNameTakenError";
  }
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeTagName(value: string): { name: string; key: string } | null {
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!name || [...name].length > MAX_TAG_NAME_LENGTH) return null;
  return { name, key: name.toLocaleLowerCase("en-US") };
}

function toTag(row: TagRecord): Tag {
  return { id: row.id, name: row.name, colorId: row.color_id };
}

export async function getTags(): Promise<Tag[]> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<TagRecord>(
      "SELECT id, name, color_id FROM tags ORDER BY name COLLATE NOCASE, id"
    );
    return rows.map(toTag);
  });
}

export async function getTag(id: string): Promise<Tag | null> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<TagRecord>(
      "SELECT id, name, color_id FROM tags WHERE id = ?",
      id
    );
    return row ? toTag(row) : null;
  });
}

/** Every tag, alphabetical, with the number of entries carrying it (unused tags included). */
export async function getTagSummaries(): Promise<TagSummary[]> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<TagRecord & { entry_count: number }>(
      `SELECT t.id, t.name, t.color_id, COUNT(et.entry_id) AS entry_count
         FROM tags t
         LEFT JOIN entry_tags et ON et.tag_id = t.id
        GROUP BY t.id
        ORDER BY t.name COLLATE NOCASE, t.id`
    );
    return rows.map((row) => ({ ...toTag(row), entryCount: row.entry_count }));
  });
}

export async function createTag(input: { name: string; colorId: TagColorId }): Promise<Tag> {
  const normalized = normalizeTagName(input.name);
  if (!normalized) throw new Error(`Tags must be between 1 and ${MAX_TAG_NAME_LENGTH} characters.`);
  if (!TAG_COLOR_IDS.includes(input.colorId)) throw new Error("Invalid tag color.");

  return runDb(async (db) => {
    const existing = await db.getFirstAsync<TagRecord>(
      "SELECT id, name, color_id FROM tags WHERE key = ?",
      normalized.key
    );
    if (existing) return toTag(existing);

    const tag = { id: createId(), name: normalized.name, colorId: input.colorId };
    const now = Date.now();
    await db.runAsync(
      "INSERT INTO tags (id, name, key, color_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [tag.id, tag.name, normalized.key, tag.colorId, now, now]
    );
    return tag;
  });
}

export async function updateTag(
  id: string,
  input: { name: string; colorId: TagColorId }
): Promise<Tag> {
  const normalized = normalizeTagName(input.name);
  if (!normalized) throw new Error(`Tags must be between 1 and ${MAX_TAG_NAME_LENGTH} characters.`);
  if (!TAG_COLOR_IDS.includes(input.colorId)) throw new Error("Invalid tag color.");

  return runDb(async (db) => {
    const duplicate = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM tags WHERE key = ? AND id <> ?",
      normalized.key,
      id
    );
    if (duplicate) throw new TagNameTakenError();

    await db.runAsync(
      "UPDATE tags SET name = ?, key = ?, color_id = ?, updated_at = ? WHERE id = ?",
      [normalized.name, normalized.key, input.colorId, Date.now(), id]
    );
    const row = await db.getFirstAsync<TagRecord>(
      "SELECT id, name, color_id FROM tags WHERE id = ?",
      id
    );
    if (!row) throw new Error("Tag not found");
    return toTag(row);
  });
}

export async function deleteTag(id: string): Promise<void> {
  await runDb(async (db) => {
    await db.runAsync("DELETE FROM tags WHERE id = ?", id);
  });
}
