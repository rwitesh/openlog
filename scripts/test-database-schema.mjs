import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { initializeDatabaseSchema } from "../src/services/db/schema.ts";

function createAdapter(database) {
  return {
    execAsync: async (source) => database.exec(source),
    getFirstAsync: async (source) => database.prepare(source).get() ?? null,
    getAllAsync: async (source, ...params) => database.prepare(source).all(...params),
    withTransactionAsync: async (task) => {
      database.exec("BEGIN");
      try {
        await task();
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

test("database initialization migrates v1 installs and maintains the FTS mirror", async (t) => {
  const database = new DatabaseSync(":memory:");
  const db = createAdapter(database);

  database.exec(`
    CREATE TABLE entries (
      id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      text TEXT,
      images TEXT,
      audios TEXT,
      latitude REAL,
      longitude REAL,
      location_name TEXT
    );
    CREATE INDEX idx_entries_created_at ON entries (created_at DESC);
    CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    PRAGMA user_version = 1;
  `);

  await initializeDatabaseSchema(db);

  await t.test("adds the attachment column and replaces the legacy index", () => {
    const columns = database.prepare("PRAGMA table_info(entries)").all();
    assert.ok(columns.some((column) => column.name === "attachments"));
    assert.equal(
      database
        .prepare("SELECT name FROM sqlite_master WHERE name = 'idx_entries_created_at'")
        .get(),
      undefined
    );
    assert.ok(
      database
        .prepare("SELECT name FROM sqlite_master WHERE name = 'idx_entries_created_at_id'")
        .get()
    );
    assert.equal(database.prepare("PRAGMA user_version").get().user_version, 2);
  });

  await t.test("indexes inserts, updates, and deletes", () => {
    database
      .prepare(
        "INSERT INTO entries (id, created_at, updated_at, text, attachments) VALUES (?, ?, ?, ?, ?)"
      )
      .run("entry-1", 1, 1, "morning walk", null);
    assert.ok(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("morning")
    );

    database.prepare("UPDATE entries SET text = ? WHERE id = ?").run("evening reading", "entry-1");
    assert.equal(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("morning"),
      undefined
    );
    assert.ok(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("evening")
    );

    database.prepare("DELETE FROM entries WHERE id = ?").run("entry-1");
    assert.equal(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("reading"),
      undefined
    );
  });
});
