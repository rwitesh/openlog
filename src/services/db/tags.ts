import { TAG_COLOR_IDS, type Tag, type TagColorId } from "@/shared/types";
import { runDb } from "./database";

export const MAX_TAG_NAME_LENGTH = 10;
export const MAX_TAGS_PER_ENTRY = 10;

interface TagRecord {
  id: string;
  name: string;
  color_id: TagColorId;
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
