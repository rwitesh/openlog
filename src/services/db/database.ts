import * as SQLite from "expo-sqlite";
import { initializeDatabaseSchema } from "./schema";

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

/** Runs an operation under the database lock to serialize with active transactions. */
export async function withDatabaseLock<T>(fn: () => Promise<T>): Promise<T> {
  return withLock(fn);
}

async function openFreshDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabaseSchema(db);
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
