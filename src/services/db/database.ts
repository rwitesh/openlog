import * as SQLite from "expo-sqlite";

const DB_NAME = "app.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let openPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
  `);

  const versionRow = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS entries (
          id            TEXT PRIMARY KEY NOT NULL,
          created_at    INTEGER NOT NULL,
          updated_at    INTEGER NOT NULL,
          text          TEXT,
          images        TEXT,
          audios        TEXT,
          latitude      REAL,
          longitude     REAL,
          location_name TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_entries_created_at_id
          ON entries (created_at DESC, id DESC);
        CREATE TABLE IF NOT EXISTS settings (
          key   TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        PRAGMA user_version = 1;
      `);
    });
  }

  if (currentVersion < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        ALTER TABLE entries ADD COLUMN attachments TEXT;
        PRAGMA user_version = 2;
      `);
    });
  }

  // Ensure composite index exists and drop legacy single-column index on upgraded installs
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_entries_created_at_id
      ON entries (created_at DESC, id DESC);
    DROP INDEX IF EXISTS idx_entries_created_at;
  `);

  await initSearchIndex(db);
}

/** Objects that make up the FTS mirror; all four must already exist for the index to be trusted. */
const SEARCH_INDEX_OBJECTS = [
  "entries_fts",
  "entries_fts_ai",
  "entries_fts_ad",
  "entries_fts_au",
] as const;

/**
 * Full-text search index over entry text and location names. The FTS5 table
 * mirrors `entries` as an external-content table, so the triggers below keep
 * both in sync without any app-level bookkeeping.
 */
async function initSearchIndex(db: SQLite.SQLiteDatabase): Promise<void> {
  // Detect a complete mirror BEFORE creating anything. `count(*)` on an
  // external-content table reads through to `entries`, so it can never prove
  // the index is populated — object presence is the only reliable signal.
  const placeholders = SEARCH_INDEX_OBJECTS.map(() => "?").join(", ");
  const existing = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE name IN (${placeholders})`,
    ...SEARCH_INDEX_OBJECTS
  );
  const hadCompleteIndex = existing.length === SEARCH_INDEX_OBJECTS.length;

  await db.execAsync(`
    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
      text,
      location_name,
      content='entries',
      content_rowid='rowid'
    )
  `);
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS entries_fts_ai AFTER INSERT ON entries BEGIN
      INSERT INTO entries_fts (rowid, text, location_name)
      VALUES (new.rowid, new.text, new.location_name);
    END
  `);
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS entries_fts_ad AFTER DELETE ON entries BEGIN
      INSERT INTO entries_fts (entries_fts, rowid, text, location_name)
      VALUES ('delete', old.rowid, old.text, old.location_name);
    END
  `);
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS entries_fts_au AFTER UPDATE ON entries BEGIN
      INSERT INTO entries_fts (entries_fts, rowid, text, location_name)
      VALUES ('delete', old.rowid, old.text, old.location_name);
      INSERT INTO entries_fts (rowid, text, location_name)
      VALUES (new.rowid, new.text, new.location_name);
    END
  `);

  // Backfill installs where the mirror was missing or incomplete (e.g. an
  // upgrade from a build predating search); the triggers keep it synced after.
  if (!hadCompleteIndex) {
    await db.execAsync(`INSERT INTO entries_fts (entries_fts) VALUES ('rebuild')`);
  }
}

async function openFreshDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(db);
  return db;
}

async function ensureDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  if (!openPromise) {
    openPromise = openFreshDatabase()
      .then((db) => {
        dbInstance = db;
        return db;
      })
      .finally(() => {
        openPromise = null;
      });
  }

  return openPromise;
}

/**
 * Opens (and lazily initialises) the app's single SQLite database.
 * Prefer {@link runDb} so access stays serialized.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return withLock(ensureDatabase);
}

/**
 * Runs a database operation. Work is serialized to avoid Android NPEs from
 * concurrent open/exec calls during startup or fast refresh.
 */
export async function runDb<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  return withLock(async () => {
    const db = await ensureDatabase();
    return await fn(db);
  });
}
