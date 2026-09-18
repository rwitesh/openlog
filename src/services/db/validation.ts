import { DATABASE_SCHEMA_VERSION, recreateSearchIndex } from "./schema.ts";
import { parseAttachments, parseUris } from "./uris.ts";

export interface ValidationDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: unknown[]): Promise<unknown>;
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export interface StagingMediaDirectory {
  exists: boolean;
  hasFile?: (name: string) => boolean;
}

export function extractMediaFilenameFromUri(rawUri: string): string | null {
  if (!rawUri || typeof rawUri !== "string") return null;
  if (rawUri.startsWith("http://") || rawUri.startsWith("https://")) return null;
  let path = rawUri;
  if (path.startsWith("file://")) {
    path = path.slice("file://".length);
  }
  const cleanPath = path.replace(/^media\//, "");
  const parts = cleanPath.split("/");
  const filename = parts[parts.length - 1];
  if (!filename || filename === "." || filename === ".." || filename.includes("\\")) {
    return null;
  }
  return filename;
}

const CANONICAL_SCHEMA = "main";
const CANONICAL_TABLES = ["entries", "tags", "entry_tags", "settings"] as const;

interface TableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface ForeignKey {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
}

interface IndexListEntry {
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
}

interface IndexColumn {
  seqno: number;
  cid: number;
  name: string | null;
  desc: number;
  coll: string;
  key: number;
}

function sameMetadata(expected: unknown, actual: unknown): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

async function assertCanonicalTable(
  database: ValidationDatabase,
  sourceSchema: string,
  table: (typeof CANONICAL_TABLES)[number]
): Promise<void> {
  const [expectedColumns, actualColumns, expectedForeignKeys, actualForeignKeys] =
    await Promise.all([
      database.getAllAsync<TableColumn>(`PRAGMA ${CANONICAL_SCHEMA}.table_info(${table})`),
      database.getAllAsync<TableColumn>(`PRAGMA ${sourceSchema}.table_info(${table})`),
      database.getAllAsync<ForeignKey>(`PRAGMA ${CANONICAL_SCHEMA}.foreign_key_list(${table})`),
      database.getAllAsync<ForeignKey>(`PRAGMA ${sourceSchema}.foreign_key_list(${table})`),
    ]);

  if (!sameMetadata(expectedColumns, actualColumns)) {
    throw new Error(`Invalid backup database: ${table} columns do not match the current schema.`);
  }
  if (!sameMetadata(expectedForeignKeys, actualForeignKeys)) {
    throw new Error(
      `Invalid backup database: ${table} foreign keys do not match the current schema.`
    );
  }

  const [expectedIndexes, actualIndexes] = await Promise.all([
    database.getAllAsync<IndexListEntry>(`PRAGMA ${CANONICAL_SCHEMA}.index_list(${table})`),
    database.getAllAsync<IndexListEntry>(`PRAGMA ${sourceSchema}.index_list(${table})`),
  ]);
  if (!sameMetadata(expectedIndexes, actualIndexes)) {
    throw new Error(`Invalid backup database: ${table} indexes do not match the current schema.`);
  }

  for (const index of expectedIndexes) {
    const [expectedColumns, actualColumns] = await Promise.all([
      database.getAllAsync<IndexColumn>(`PRAGMA ${CANONICAL_SCHEMA}.index_xinfo(${index.name})`),
      database.getAllAsync<IndexColumn>(`PRAGMA ${sourceSchema}.index_xinfo(${index.name})`),
    ]);
    if (!sameMetadata(expectedColumns, actualColumns)) {
      throw new Error(
        `Invalid backup database: ${table}.${index.name} does not match the current schema.`
      );
    }
  }
}

/**
 * Validates an attached staged database:
 * - Integrity check
 * - Schema version (user_version <= DATABASE_SCHEMA_VERSION, >= 1)
 * - Foreign key violations
 * - Base table, foreign-key, and index metadata matched against the initialized canonical schema
 * - Recreated FTS virtual table and synchronization triggers
 * - Referential media integrity against extracted staging files
 */
export async function validateAttachedDatabase(
  database: ValidationDatabase,
  sourceSchema: string,
  stagingMediaDir?: StagingMediaDirectory
): Promise<number> {
  const integrity = await database.getFirstAsync<{ integrity_check: string }>(
    `PRAGMA ${sourceSchema}.integrity_check`
  );
  if (integrity?.integrity_check !== "ok") {
    throw new Error("Invalid backup database: integrity check failed.");
  }

  const version = await database.getFirstAsync<{ user_version: number }>(
    `PRAGMA ${sourceSchema}.user_version`
  );
  if (version == null || typeof version.user_version !== "number" || version.user_version < 1) {
    throw new Error("Invalid backup database: missing or invalid user_version.");
  }
  if (version.user_version > DATABASE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported backup database version (${version.user_version}). Please update OpenLog.`
    );
  }

  const fkViolations = await database.getAllAsync<unknown>(
    `PRAGMA ${sourceSchema}.foreign_key_check`
  );
  if (fkViolations.length > 0) {
    throw new Error("Invalid backup database: foreign key check failed.");
  }

  const tables = await database.getAllAsync<{ name: string }>(
    `SELECT name FROM ${sourceSchema}.sqlite_master
     WHERE type = 'table' AND name IN ('entries', 'tags', 'entry_tags', 'settings')`
  );
  if (tables.length !== CANONICAL_TABLES.length) {
    throw new Error("Invalid backup database: required tables are missing.");
  }

  for (const table of CANONICAL_TABLES) {
    await assertCanonicalTable(database, sourceSchema, table);
  }

  // FTS is derived from entries, so no staged FTS object is trusted during restore.
  await recreateSearchIndex(database, sourceSchema);

  // Validate media references against stagingMediaDir (if provided)
  if (stagingMediaDir) {
    const mediaRows = await database.getAllAsync<{
      images: string | null;
      audios: string | null;
      attachments: string | null;
    }>(
      `SELECT images, audios, attachments FROM ${sourceSchema}.entries
       WHERE images IS NOT NULL OR audios IS NOT NULL OR attachments IS NOT NULL`
    );
    const checkedMedia = new Set<string>();
    for (const row of mediaRows) {
      const uris = [
        ...parseUris(row.images),
        ...parseUris(row.audios),
        ...parseAttachments(row.attachments).map((a) => a.uri),
      ];
      for (const rawUri of uris) {
        const filename = extractMediaFilenameFromUri(rawUri);
        if (!filename || checkedMedia.has(filename)) continue;
        const fileExists =
          typeof stagingMediaDir.hasFile === "function" ? stagingMediaDir.hasFile(filename) : false;
        if (!fileExists) {
          throw new Error(
            `Invalid backup database: referenced media file "${filename}" is missing.`
          );
        }
        checkedMedia.add(filename);
      }
    }
  }

  const count = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM ${sourceSchema}.entries`
  );
  return count?.count ?? 0;
}
