import { type Directory, File } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { analytics } from "@/config/analytics";
import {
  applyPendingRestore,
  completePendingRestore,
  rollbackPendingRestore,
} from "@/services/backup/restore";
import { DATABASE_SIZE_CEILING } from "@/services/backup/shared";
import { notifyBackupImportComplete } from "@/services/notifications";
import { logDevWarning } from "@/shared/utils/devLog";
import { initializeDatabaseSchema, migrateRestoreSchema } from "./schema";

export { DATABASE_SIZE_CEILING };

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
  const restoreResult = await applyPendingRestore();
  if (restoreResult.applied) {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await initializeDatabaseSchema(db);
      await completePendingRestore(db, {
        notify: notifyBackupImportComplete,
        analytics: (count) => analytics.capture("backup_imported", { entry_count: count }),
      });
      return db;
    } catch (error) {
      logDevWarning("openFreshDatabase:restoreVerificationFailed", error);
      await rollbackPendingRestore();
      const originalDb = await SQLite.openDatabaseAsync(DB_NAME);
      await initializeDatabaseSchema(originalDb);
      return originalDb;
    }
  }

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

/**
 * Serializes a database connection into a snapshot file, enforcing the size ceiling.
 */
export async function createDatabaseSnapshotFromDb(
  sourceDatabase: SQLite.SQLiteDatabase,
  snapshotFile: File
): Promise<number> {
  // Check estimated page count before serialization to prevent out-of-memory crashes
  const pageCountResult = await sourceDatabase.getFirstAsync<{ page_count: number }>(
    "PRAGMA page_count"
  );
  const pageSizeResult = await sourceDatabase.getFirstAsync<{ page_size: number }>(
    "PRAGMA page_size"
  );
  const estimatedBytes = (pageCountResult?.page_count ?? 0) * (pageSizeResult?.page_size ?? 4096);
  if (estimatedBytes > DATABASE_SIZE_CEILING) {
    const sizeMib = Math.round(estimatedBytes / (1024 * 1024));
    throw new Error(`Database is too large to export (${sizeMib} MiB exceeds the 256 MiB limit).`);
  }

  const serialized = await sourceDatabase.serializeAsync();
  if (serialized.byteLength > DATABASE_SIZE_CEILING) {
    const sizeMib = Math.round(serialized.byteLength / (1024 * 1024));
    throw new Error(`Database is too large to export (${sizeMib} MiB exceeds the 256 MiB limit).`);
  }

  if (snapshotFile.exists) snapshotFile.delete();
  snapshotFile.create({ overwrite: true });
  snapshotFile.write(serialized);
  const count = await sourceDatabase.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM entries"
  );
  return count?.count ?? 0;
}

/**
 * Serializes the active connection so committed WAL data is included without a second native handle.
 * Enforces {@link DATABASE_SIZE_CEILING} (256 MiB) before and after serialization to prevent OOM crashes.
 */
export async function createDatabaseSnapshot(snapshotFile: File): Promise<number> {
  return await runDb(async (db) => createDatabaseSnapshotFromDb(db, snapshotFile));
}

/**
 * Takes a database snapshot and captures media files atomically under the database lock.
 * Avoids deadlocks by executing within a single runDb lock invocation.
 */
export async function snapshotDatabaseAndMedia(
  snapshotFile: File,
  listMediaFn: () => File[]
): Promise<{ entryCount: number; mediaFiles: File[] }> {
  return await runDb(async (db) => {
    const entryCount = await createDatabaseSnapshotFromDb(db, snapshotFile);
    const mediaFiles = listMediaFn();
    return { entryCount, mediaFiles };
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

import { validateAttachedDatabase } from "./validation";

/** Validates a staged backup through the active connection, avoiding a temporary native handle. */
export async function validateDatabaseSnapshot(
  snapshotFile: File,
  stagingMediaDir?: Directory
): Promise<number> {
  return await runDb(async (database) => {
    await attachRestoreSource(database, snapshotFile);
    try {
      await migrateRestoreSchema(database, RESTORE_SOURCE);
      return await validateAttachedDatabase(database, RESTORE_SOURCE, stagingMediaDir);
    } finally {
      await detachRestoreSource(database);
    }
  });
}
