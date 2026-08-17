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
