import { File } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { applyPendingRestore, completePendingRestore } from "@/services/backup/restoreTransaction";
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
  await applyPendingRestore();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabaseSchema(db);
  await completePendingRestore();
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

/** Serializes the active connection so committed WAL data is included without a second native handle. */
export async function createDatabaseSnapshot(snapshotFile: File): Promise<number> {
  return await withLock(async () => {
    const sourceDatabase = await ensureDatabase();
    if (snapshotFile.exists) snapshotFile.delete();
    snapshotFile.create({ overwrite: true });
    snapshotFile.write(await sourceDatabase.serializeAsync());
    const count = await sourceDatabase.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM entries"
    );
    return count?.count ?? 0;
  });
}

/** Removes a temporary SQLite snapshot without opening a native SQLite connection. */
export async function deleteDatabaseSnapshot(snapshotFile: File): Promise<void> {
  for (const suffix of ["", "-shm", "-wal"] as const) {
    const file = new File(snapshotFile.parentDirectory, `${snapshotFile.name}${suffix}`);
    if (file.exists) file.delete();
  }
}

const RESTORE_SOURCE = "restore_source";

async function attachRestoreSource(
  database: SQLite.SQLiteDatabase,
  snapshotFile: File
): Promise<void> {
  const databasePath = snapshotFile.uri.replace(/^file:\/\//, "");
  await database.runAsync(`ATTACH DATABASE ? AS ${RESTORE_SOURCE}`, [databasePath]);
}

async function detachRestoreSource(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`DETACH DATABASE ${RESTORE_SOURCE}`);
}

/** Validates a staged backup through the active connection, avoiding a temporary native handle. */
export async function validateDatabaseSnapshot(snapshotFile: File): Promise<number> {
  return await runDb(async (database) => {
    await attachRestoreSource(database, snapshotFile);
    try {
      const integrity = await database.getFirstAsync<{ integrity_check: string }>(
        `PRAGMA ${RESTORE_SOURCE}.integrity_check`
      );
      if (integrity?.integrity_check !== "ok") {
        throw new Error("Invalid backup database: integrity check failed.");
      }
      const version = await database.getFirstAsync<{ user_version: number }>(
        `PRAGMA ${RESTORE_SOURCE}.user_version`
      );
      if (version?.user_version !== DATABASE_SCHEMA_VERSION) {
        throw new Error("Unsupported backup database version.");
      }
      const requiredTables = await database.getAllAsync<{ name: string }>(
        `SELECT name FROM ${RESTORE_SOURCE}.sqlite_master
         WHERE type = 'table' AND name IN ('entries', 'tags', 'entry_tags', 'settings')`
      );
      if (requiredTables.length !== 4) {
        throw new Error("Invalid backup database: required tables are missing.");
      }
      const count = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM ${RESTORE_SOURCE}.entries`
      );
      return count?.count ?? 0;
    } finally {
      await detachRestoreSource(database);
    }
  });
}
