import type { SchemaDatabase } from "../schema.ts";

/** The complete fresh-install schema. Keep this file unchanged after it ships. */
export async function migrateToV1(db: SchemaDatabase, _schema: string): Promise<void> {
  await db.execAsync(`
    CREATE TABLE entries (
      id          TEXT PRIMARY KEY NOT NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      text        TEXT,
      images      TEXT,
      audios      TEXT,
      attachments TEXT,
      latitude    REAL,
      longitude   REAL,
      location    TEXT
    );
    CREATE INDEX idx_entries_created_at_id
      ON entries (created_at DESC, id DESC);
    CREATE TABLE tags (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      key        TEXT NOT NULL UNIQUE,
      color_id   TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE entry_tags (
      entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (entry_id, tag_id)
    );
    CREATE INDEX idx_entry_tags_tag_entry
      ON entry_tags (tag_id, entry_id);
    CREATE TABLE settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}
