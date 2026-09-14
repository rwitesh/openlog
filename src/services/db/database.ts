import * as SQLite from "expo-sqlite";
import { recoverIncompleteRestore } from "@/services/backup/restoreTransaction";
import { DATABASE_SCHEMA_VERSION, initializeDatabaseSchema } from "./schema";

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

async function openFreshDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabaseSchema(db);
  await recoverIncompleteRestore(db);
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

/** Creates a coherent SQLite file using SQLite's native backup API, including committed WAL data. */
export async function createDatabaseSnapshot(filename: string, directory: string): Promise<void> {
  await withLock(async () => {
    const sourceDatabase = await ensureDatabase();
    const snapshotDatabase = await SQLite.openDatabaseAsync(
      filename,
      { useNewConnection: true },
      directory
    );
    try {
      await SQLite.backupDatabaseAsync({ sourceDatabase, destDatabase: snapshotDatabase });
    } finally {
      await snapshotDatabase.closeAsync();
    }
  });
}

/** Removes a closed temporary SQLite snapshot and any native sidecar files. */
export async function deleteDatabaseSnapshot(filename: string, directory: string): Promise<void> {
  await SQLite.deleteDatabaseAsync(filename, directory);
}

/** Validates a staged raw backup database before it can replace the active timeline. */
export async function validateDatabaseSnapshot(
  filename: string,
  directory: string
): Promise<number> {
  const snapshotDatabase = await SQLite.openDatabaseAsync(
    filename,
    { useNewConnection: true },
    directory
  );
  try {
    const integrity = await snapshotDatabase.getFirstAsync<{ integrity_check: string }>(
      "PRAGMA integrity_check"
    );
    if (integrity?.integrity_check !== "ok") {
      throw new Error("Invalid backup database: integrity check failed.");
    }
    const version = await snapshotDatabase.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version"
    );
    if (version?.user_version !== DATABASE_SCHEMA_VERSION) {
      throw new Error("Unsupported backup database version.");
    }
    const requiredTables = await snapshotDatabase.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('entries', 'tags', 'entry_tags', 'settings')"
    );
    if (requiredTables.length !== 4) {
      throw new Error("Invalid backup database: required tables are missing.");
    }
    const count = await snapshotDatabase.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM entries"
    );
    return count?.count ?? 0;
  } finally {
    await snapshotDatabase.closeAsync();
  }
}

/** Replaces the active SQLite contents from a validated staged database under the database lock. */
export async function restoreDatabaseSnapshot(
  filename: string,
  directory: string,
  restoreTransactionId: string
): Promise<void> {
  const snapshotDatabase = await SQLite.openDatabaseAsync(
    filename,
    { useNewConnection: true },
    directory
  );
  try {
    await snapshotDatabase.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ["restore_transaction_id", restoreTransactionId]
    );
    await withLock(async () => {
      const destinationDatabase = await ensureDatabase();
      await SQLite.backupDatabaseAsync({
        sourceDatabase: snapshotDatabase,
        destDatabase: destinationDatabase,
      });
      await initializeDatabaseSchema(destinationDatabase);
    });
  } finally {
    await snapshotDatabase.closeAsync();
  }
}
