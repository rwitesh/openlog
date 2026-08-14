import * as SQLite from "expo-sqlite";

import { logDevWarning } from "@/lib/devLog";
import { parseUris } from "./uris";

const DB_NAME = "kizuna.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let rebuildPromise: Promise<void> | null = null;

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS entries (
    id            TEXT PRIMARY KEY NOT NULL,
    type          TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    text          TEXT,
    uri           TEXT,
    uris          TEXT,
    duration_ms   INTEGER,
    latitude      REAL,
    longitude     REAL,
    location_name TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_entries_created_at
    ON entries (created_at DESC);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

async function openFreshDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(SCHEMA);
  return db;
}

/**
 * Deletes the database file and opens a fresh connection with the current schema.
 * Single-flight so parallel callers (e.g. bootstrap) don't race drops/recreates.
 */
async function rebuildDatabase(): Promise<void> {
  if (rebuildPromise) {
    await rebuildPromise;
    return;
  }

  rebuildPromise = (async () => {
    if (dbInstance) {
      await dbInstance.closeAsync();
      dbInstance = null;
    }

    try {
      await SQLite.deleteDatabaseAsync(DB_NAME);
    } catch {
      // File may already be missing.
    }

    dbInstance = await openFreshDatabase();
  })();

  try {
    await rebuildPromise;
  } finally {
    rebuildPromise = null;
  }
}

/**
 * Opens (and lazily initialises) the app's single SQLite database.
 * The schema is created idempotently on first open.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openFreshDatabase();
  return dbInstance;
}

/**
 * Runs a database operation. On failure, rebuilds the database and retries once.
 * Early-phase recovery — no migrations.
 */
export async function runDb<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  try {
    return await fn(await getDatabase());
  } catch (firstError) {
    await rebuildDatabase();
    try {
      return await fn(await getDatabase());
    } catch (retryError) {
      logDevWarning("db:runDb", retryError);
      throw retryError;
    }
  }
}

/** Media URIs still on disk before the database file is deleted. */
async function collectMediaUris(): Promise<string[]> {
  try {
    return await runDb(async (db) => {
      const rows = await db.getAllAsync<{
        type: string;
        uri: string | null;
        uris: string | null;
      }>(`SELECT type, uri, uris FROM entries`);

      const mediaUris: string[] = [];
      for (const row of rows) {
        if (row.type === "audio" && row.uri) {
          mediaUris.push(row.uri);
        } else if (row.type === "image" && row.uris) {
          mediaUris.push(...parseUris(row.uris));
        }
      }
      return mediaUris;
    });
  } catch {
    return [];
  }
}

/**
 * Drops the database file and recreates an empty schema.
 * Use when migrations fail or the schema is corrupted.
 */
export async function resetDatabase(): Promise<string[]> {
  const uris = await collectMediaUris();
  await rebuildDatabase();
  return uris;
}
