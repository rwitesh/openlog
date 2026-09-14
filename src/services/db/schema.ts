export interface SchemaDatabase {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: string[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export async function initializeDatabaseSchema(db: SchemaDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
  `);

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS entries (
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
      CREATE INDEX IF NOT EXISTS idx_entries_created_at_id
        ON entries (created_at DESC, id DESC);
      CREATE TABLE IF NOT EXISTS tags (
        id         TEXT PRIMARY KEY NOT NULL,
        name       TEXT NOT NULL,
        key        TEXT NOT NULL UNIQUE,
        color_id   TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (entry_id, tag_id)
      );
      CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_entry
        ON entry_tags (tag_id, entry_id);
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  });

  await initializeSearchIndex(db);
}

async function initializeSearchIndex(db: SchemaDatabase): Promise<void> {
  const searchIndexObjects = [
    "entries_fts",
    "entries_fts_ai",
    "entries_fts_ad",
    "entries_fts_au",
  ] as const;
  const placeholders = searchIndexObjects.map(() => "?").join(", ");
  const existing = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE name IN (${placeholders})`,
    ...searchIndexObjects
  );
  const hadCompleteIndex = existing.length === searchIndexObjects.length;

  // The external-content FTS table mirrors entries through these triggers.
  await db.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
      text,
      location,
      content='entries',
      content_rowid='rowid'
    )
  `);
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS entries_fts_ai AFTER INSERT ON entries BEGIN
      INSERT INTO entries_fts (rowid, text, location)
      VALUES (new.rowid, new.text, new.location);
    END
  `);
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS entries_fts_ad AFTER DELETE ON entries BEGIN
      INSERT INTO entries_fts (entries_fts, rowid, text, location)
      VALUES ('delete', old.rowid, old.text, old.location);
    END
  `);
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS entries_fts_au AFTER UPDATE ON entries BEGIN
      INSERT INTO entries_fts (entries_fts, rowid, text, location)
      VALUES ('delete', old.rowid, old.text, old.location);
      INSERT INTO entries_fts (rowid, text, location)
      VALUES (new.rowid, new.text, new.location);
    END
  `);

  if (!hadCompleteIndex) {
    // Populate an index created after entries already exist.
    await db.execAsync(`INSERT INTO entries_fts (entries_fts) VALUES ('rebuild')`);
  }
}
