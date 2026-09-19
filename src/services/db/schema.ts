import { migrateToV1 } from "./migrations/v1.ts";

export interface SchemaDatabase {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

interface DatabaseMigration {
  version: number;
  up: (db: SchemaDatabase, schema: string) => Promise<void>;
}

/**
 * Add one immutable file per forward schema change, then register it here.
 * Never edit a migration that has shipped or renumber an existing version.
 */
const MIGRATIONS: readonly DatabaseMigration[] = [{ version: 1, up: migrateToV1 }];

export const DATABASE_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

async function readSchemaVersion(db: SchemaDatabase, schema: string): Promise<number> {
  const result = await db.getFirstAsync<{ user_version: number }>(`PRAGMA ${schema}.user_version`);
  return result?.user_version ?? 0;
}

async function applyMigrations(
  db: SchemaDatabase,
  currentVersion: number,
  minimumVersion: number,
  schema: string
): Promise<void> {
  if (currentVersion < minimumVersion) {
    throw new Error(`Unsupported database version (${currentVersion}).`);
  }
  if (currentVersion > DATABASE_SCHEMA_VERSION) {
    throw new Error(`Unsupported database version (${currentVersion}). Please update OpenLog.`);
  }

  const pending = MIGRATIONS.filter((migration) => migration.version > currentVersion);
  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db, schema);
      await db.execAsync(`PRAGMA ${schema}.user_version = ${migration.version}`);
    });
  }
}

/** Opens a fresh database at v1, or moves an existing supported database forward. */
export async function migrateDatabaseSchema(db: SchemaDatabase): Promise<void> {
  await applyMigrations(db, await readSchemaVersion(db, "main"), 0, "main");
}

export async function initializeDatabaseSchema(db: SchemaDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
  `);

  await migrateDatabaseSchema(db);
  await initializeSearchIndex(db);
}

export async function recreateSearchIndex(db: SchemaDatabase, schema: string): Promise<void> {
  await db.execAsync(`
    DROP TRIGGER IF EXISTS ${schema}.entries_fts_ai;
    DROP TRIGGER IF EXISTS ${schema}.entries_fts_ad;
    DROP TRIGGER IF EXISTS ${schema}.entries_fts_au;
    DROP TABLE IF EXISTS ${schema}.entries_fts;
    CREATE VIRTUAL TABLE ${schema}.entries_fts USING fts5(
      text,
      location,
      content='entries',
      content_rowid='rowid'
    );
    CREATE TRIGGER ${schema}.entries_fts_ai AFTER INSERT ON entries BEGIN
      INSERT INTO entries_fts (rowid, text, location)
      VALUES (new.rowid, new.text, new.location);
    END;
    CREATE TRIGGER ${schema}.entries_fts_ad AFTER DELETE ON entries BEGIN
      INSERT INTO entries_fts (entries_fts, rowid, text, location)
      VALUES ('delete', old.rowid, old.text, old.location);
    END;
    CREATE TRIGGER ${schema}.entries_fts_au AFTER UPDATE ON entries BEGIN
      INSERT INTO entries_fts (entries_fts, rowid, text, location)
      VALUES ('delete', old.rowid, old.text, old.location);
      INSERT INTO entries_fts (rowid, text, location)
      VALUES (new.rowid, new.text, new.location);
    END;
    INSERT INTO ${schema}.entries_fts(entries_fts) VALUES ('rebuild');
  `);
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

  if (!hadCompleteIndex) {
    await recreateSearchIndex(db, "main");
  }
}
