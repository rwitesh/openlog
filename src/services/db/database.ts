import * as SQLite from "expo-sqlite";

import { logDevWarning } from "@/shared/utils/devLog";

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
  await db.execAsync(`PRAGMA journal_mode = WAL`);
  await db.execAsync(`PRAGMA foreign_keys = ON`);
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
    )
  `);
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_entries_created_at
      ON entries (created_at DESC)
  `);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )
  `);
  await initSearchIndex(db);
}

/**
 * Full-text search index over entry text and location names. The FTS5 table
 * mirrors `entries` as an external-content table, so the triggers below keep
 * both in sync without any app-level bookkeeping.
 */
async function initSearchIndex(db: SQLite.SQLiteDatabase): Promise<void> {
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

  // Backfill installs that predate full-text search; triggers keep it in sync afterwards.
  const counts = await db.getFirstAsync<{ indexed: number; total: number }>(
    `SELECT (SELECT count(*) FROM entries_fts) AS indexed,
            (SELECT count(*) FROM entries) AS total`
  );
  if (counts && counts.indexed !== counts.total) {
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
export async function runDb<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  return withLock(async () => {
    const db = await ensureDatabase();
    return await fn(db);
  });
}
