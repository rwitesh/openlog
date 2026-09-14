import { DATABASE_SCHEMA_VERSION } from "./schema.ts";
import { parseAttachments, parseUris } from "./uris.ts";

export interface DatabaseValidationTarget {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: unknown[]): Promise<unknown>;
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
}

export interface StagingMediaDirectory {
  exists: boolean;
  hasFile?: (name: string) => boolean;
}

export function extractMediaFilename(rawUri: string): string | null {
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

/**
 * Validates an attached staged database:
 * - Integrity check
 * - Schema version (user_version <= DATABASE_SCHEMA_VERSION, >= 1)
 * - Foreign key violations
 * - Table definitions and constraints (entries, tags, entry_tags, settings)
 * - Required indexes and FTS virtual table & synchronization triggers
 * - Referential media integrity against extracted staging files
 */
export async function validateAttachedDatabase(
  database: DatabaseValidationTarget,
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

  const requiredTables = ["entries", "tags", "entry_tags", "settings"];
  const tables = await database.getAllAsync<{ name: string }>(
    `SELECT name FROM ${sourceSchema}.sqlite_master
     WHERE type = 'table' AND name IN ('entries', 'tags', 'entry_tags', 'settings')`
  );
  if (tables.length !== requiredTables.length) {
    throw new Error("Invalid backup database: required tables are missing.");
  }

  // Validate 'entries' schema: id (PK), created_at, updated_at, text, images, audios, attachments, latitude, longitude, location
  const entriesInfo = await database.getAllAsync<{ name: string; pk: number }>(
    `PRAGMA ${sourceSchema}.table_info(entries)`
  );
  const entriesCols = new Map(entriesInfo.map((c) => [c.name, c]));
  const requiredEntriesCols = [
    "id",
    "created_at",
    "updated_at",
    "text",
    "images",
    "audios",
    "attachments",
    "latitude",
    "longitude",
    "location",
  ];
  for (const col of requiredEntriesCols) {
    if (!entriesCols.has(col)) {
      throw new Error(`Invalid backup database: entries table is missing column '${col}'.`);
    }
  }
  if ((entriesCols.get("id")?.pk ?? 0) < 1) {
    throw new Error("Invalid backup database: entries.id must be a primary key.");
  }

  // Validate 'tags' schema: id (PK), name, key (UNIQUE), color_id, created_at, updated_at
  const tagsInfo = await database.getAllAsync<{ name: string; pk: number }>(
    `PRAGMA ${sourceSchema}.table_info(tags)`
  );
  const tagsCols = new Map(tagsInfo.map((c) => [c.name, c]));
  const requiredTagsCols = ["id", "name", "key", "color_id", "created_at", "updated_at"];
  for (const col of requiredTagsCols) {
    if (!tagsCols.has(col)) {
      throw new Error(`Invalid backup database: tags table is missing column '${col}'.`);
    }
  }
  if ((tagsCols.get("id")?.pk ?? 0) < 1) {
    throw new Error("Invalid backup database: tags.id must be a primary key.");
  }

  const tagsIndexes = await database.getAllAsync<{ name: string; unique: number }>(
    `PRAGMA ${sourceSchema}.index_list(tags)`
  );
  let keyIsUnique = false;
  for (const idx of tagsIndexes) {
    if (idx.unique === 1) {
      const idxCols = await database.getAllAsync<{ name: string }>(
        `PRAGMA ${sourceSchema}.index_info(${idx.name})`
      );
      if (idxCols.length === 1 && idxCols[0].name === "key") {
        keyIsUnique = true;
        break;
      }
    }
  }
  if (!keyIsUnique) {
    throw new Error("Invalid backup database: tags.key must have a UNIQUE constraint.");
  }

  // Validate 'entry_tags' schema: entry_id (PK, FK), tag_id (PK, FK)
  const entryTagsInfo = await database.getAllAsync<{ name: string; pk: number }>(
    `PRAGMA ${sourceSchema}.table_info(entry_tags)`
  );
  const entryTagsCols = new Map(entryTagsInfo.map((c) => [c.name, c]));
  if (!entryTagsCols.has("entry_id") || !entryTagsCols.has("tag_id")) {
    throw new Error("Invalid backup database: entry_tags table missing required columns.");
  }
  if ((entryTagsCols.get("entry_id")?.pk ?? 0) < 1 || (entryTagsCols.get("tag_id")?.pk ?? 0) < 1) {
    throw new Error(
      "Invalid backup database: entry_tags must have a composite primary key on (entry_id, tag_id)."
    );
  }

  const entryTagsFks = await database.getAllAsync<{ table: string; from: string; to: string }>(
    `PRAGMA ${sourceSchema}.foreign_key_list(entry_tags)`
  );
  const hasEntryFk = entryTagsFks.some(
    (fk) => fk.table === "entries" && fk.from === "entry_id" && fk.to === "id"
  );
  const hasTagFk = entryTagsFks.some(
    (fk) => fk.table === "tags" && fk.from === "tag_id" && fk.to === "id"
  );
  if (!hasEntryFk || !hasTagFk) {
    throw new Error(
      "Invalid backup database: entry_tags missing required foreign key constraints."
    );
  }

  // Validate 'settings' schema: key (PK), value
  const settingsInfo = await database.getAllAsync<{ name: string; pk: number }>(
    `PRAGMA ${sourceSchema}.table_info(settings)`
  );
  const settingsCols = new Map(settingsInfo.map((c) => [c.name, c]));
  if (!settingsCols.has("key") || !settingsCols.has("value")) {
    throw new Error("Invalid backup database: settings table missing required columns.");
  }
  if ((settingsCols.get("key")?.pk ?? 0) < 1) {
    throw new Error("Invalid backup database: settings.key must be a primary key.");
  }

  // Validate required indexes: idx_entries_created_at_id, idx_entry_tags_tag_entry
  const indexes = await database.getAllAsync<{ name: string }>(
    `SELECT name FROM ${sourceSchema}.sqlite_master
     WHERE type = 'index' AND name IN ('idx_entries_created_at_id', 'idx_entry_tags_tag_entry')`
  );
  if (indexes.length !== 2) {
    throw new Error("Invalid backup database: required indexes are missing.");
  }

  // Validate FTS virtual table and triggers (recreate/rebuild if missing or corrupted)
  const ftsObjects = await database.getAllAsync<{ name: string }>(
    `SELECT name FROM ${sourceSchema}.sqlite_master
     WHERE name IN ('entries_fts', 'entries_fts_ai', 'entries_fts_ad', 'entries_fts_au')`
  );
  let ftsValid = ftsObjects.length === 4;
  if (ftsValid) {
    try {
      await database.runAsync(
        `INSERT INTO ${sourceSchema}.entries_fts(entries_fts) VALUES('integrity-check')`
      );
    } catch {
      ftsValid = false;
    }
  }

  if (!ftsValid) {
    await database.execAsync(`
      DROP TRIGGER IF EXISTS ${sourceSchema}.entries_fts_ai;
      DROP TRIGGER IF EXISTS ${sourceSchema}.entries_fts_ad;
      DROP TRIGGER IF EXISTS ${sourceSchema}.entries_fts_au;
      DROP TABLE IF EXISTS ${sourceSchema}.entries_fts;
      CREATE VIRTUAL TABLE ${sourceSchema}.entries_fts USING fts5(
        text,
        location,
        content='entries',
        content_rowid='rowid'
      );
      CREATE TRIGGER ${sourceSchema}.entries_fts_ai AFTER INSERT ON entries BEGIN
        INSERT INTO entries_fts (rowid, text, location)
        VALUES (new.rowid, new.text, new.location);
      END;
      CREATE TRIGGER ${sourceSchema}.entries_fts_ad AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts (entries_fts, rowid, text, location)
        VALUES ('delete', old.rowid, old.text, old.location);
      END;
      CREATE TRIGGER ${sourceSchema}.entries_fts_au AFTER UPDATE ON entries BEGIN
        INSERT INTO entries_fts (entries_fts, rowid, text, location)
        VALUES ('delete', old.rowid, old.text, old.location);
        INSERT INTO entries_fts (rowid, text, location)
        VALUES (new.rowid, new.text, new.location);
      END;
      INSERT INTO ${sourceSchema}.entries_fts(entries_fts) VALUES ('rebuild');
    `);
    await database.runAsync(
      `INSERT INTO ${sourceSchema}.entries_fts(entries_fts) VALUES('integrity-check')`
    );
  }

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
        const filename = extractMediaFilename(rawUri);
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
  // Unreferenced media files in staging are tolerated (e.g. remnants of deleted entries or orphan attachments).

  const count = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM ${sourceSchema}.entries`
  );
  return count?.count ?? 0;
}
