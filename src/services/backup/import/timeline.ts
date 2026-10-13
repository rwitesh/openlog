import type { BackupTimelineData } from "../utils/types";

export interface ImportDatabase {
  runAsync(source: string, ...params: unknown[]): Promise<unknown>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** Replaces all timeline rows in one transaction; on failure the existing rows remain. */
export async function replaceTimelineData(
  db: ImportDatabase,
  timeline: BackupTimelineData
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM entry_tags");
    await db.runAsync("DELETE FROM tags");
    await db.runAsync("DELETE FROM entries");
    await db.runAsync("DELETE FROM settings");

    for (const tag of timeline.tags) {
      await db.runAsync(
        `INSERT INTO tags (id, name, key, color_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        tag.id,
        tag.name,
        tag.key,
        tag.colorId,
        tag.createdAt,
        tag.updatedAt
      );
    }

    for (const entry of timeline.entries) {
      await db.runAsync(
        `INSERT INTO entries (
           id, created_at, updated_at, text, images, audios, attachments,
           latitude, longitude, location
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.id,
        entry.createdAt,
        entry.updatedAt,
        entry.text ?? null,
        entry.images?.length ? JSON.stringify(entry.images) : null,
        entry.audios?.length ? JSON.stringify(entry.audios) : null,
        entry.attachments?.length ? JSON.stringify(entry.attachments) : null,
        entry.location?.latitude ?? null,
        entry.location?.longitude ?? null,
        entry.location?.name ?? null
      );
      for (const tagId of entry.tagIds ?? []) {
        await db.runAsync(
          "INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
          entry.id,
          tagId
        );
      }
    }

    if (timeline.settings) {
      for (const [key, value] of Object.entries(timeline.settings)) {
        await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", key, value);
      }
    }
    await db.runAsync("INSERT INTO entries_fts(entries_fts) VALUES ('rebuild')");
  });
}
