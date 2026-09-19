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

test("database initialization creates the current schema and maintains the FTS mirror", async (t) => {
  const database = new DatabaseSync(":memory:");
  const db = createAdapter(database);

  await initializeDatabaseSchema(db);

  await t.test("creates entries, tags, and their indexed links", () => {
    const columns = database.prepare("PRAGMA table_info(entries)").all();
    assert.ok(columns.some((column) => column.name === "attachments"));
    assert.ok(columns.some((column) => column.name === "location"));
    assert.ok(!columns.some((column) => column.name === "location_name"));
    assert.ok(
      database
        .prepare("SELECT name FROM sqlite_master WHERE name = 'idx_entries_created_at_id'")
        .get()
    );
    assert.equal(database.prepare("PRAGMA user_version").get().user_version, 1);
    assert.ok(database.prepare("SELECT name FROM sqlite_master WHERE name = 'tags'").get());
    assert.ok(database.prepare("SELECT name FROM sqlite_master WHERE name = 'entry_tags'").get());
    assert.ok(
      database
        .prepare("SELECT name FROM sqlite_master WHERE name = 'idx_entry_tags_tag_entry'")
        .get()
    );
  });

  await t.test("removes links, but not reusable tags, when an entry is deleted", () => {
    database
      .prepare(
        "INSERT INTO tags (id, name, key, color_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("tag-1", "Work", "work", "clay", 1, 1);
    database
      .prepare("INSERT INTO entries (id, created_at, updated_at) VALUES (?, ?, ?)")
      .run("tagged-entry", 1, 1);
    database
      .prepare("INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)")
      .run("tagged-entry", "tag-1");

    database.prepare("DELETE FROM entries WHERE id = ?").run("tagged-entry");
    assert.equal(
      database.prepare("SELECT * FROM entry_tags WHERE tag_id = ?").get("tag-1"),
      undefined
    );
    assert.ok(database.prepare("SELECT * FROM tags WHERE id = ?").get("tag-1"));
  });

  await t.test("finds entries by the normalized prefix of an attached tag", () => {
    database
      .prepare("INSERT INTO entries (id, created_at, updated_at) VALUES (?, ?, ?)")
      .run("searchable-tagged-entry", 2, 2);
    database
      .prepare("INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)")
      .run("searchable-tagged-entry", "tag-1");

    const matches = database
      .prepare(
        `SELECT e.id
           FROM entries e
           JOIN entry_tags et ON et.entry_id = e.id
           JOIN tags t ON t.id = et.tag_id
          WHERE instr(t.key, ?) = 1`
      )
      .all("wo");
    assert.deepEqual(
      matches.map((match) => match.id),
      ["searchable-tagged-entry"]
    );
  });

  await t.test("indexes entry text and locations across inserts, updates, and deletes", () => {
    database
      .prepare(
        "INSERT INTO entries (id, created_at, updated_at, text, attachments, location) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("entry-1", 1, 1, "morning walk", null, "Cubbon Park");
    assert.ok(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("morning")
    );
    assert.ok(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("cubbon")
    );

    database.prepare("UPDATE entries SET text = ? WHERE id = ?").run("evening reading", "entry-1");
    assert.equal(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("morning"),
      undefined
    );
    assert.ok(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("evening")
    );

    database
      .prepare("UPDATE entries SET location = ? WHERE id = ?")
      .run("Lalbagh Garden", "entry-1");
    assert.equal(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("cubbon"),
      undefined
    );
    assert.ok(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("lalbagh")
    );

    database.prepare("DELETE FROM entries WHERE id = ?").run("entry-1");
    assert.equal(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("reading"),
      undefined
    );
    assert.equal(
      database.prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?").get("lalbagh"),
      undefined
    );
  });
});

test("foreign keys are enforced only after migrations complete", async () => {
  const database = new DatabaseSync(":memory:");
  const base = createAdapter(database);
  const foreignKeyStatesDuringMigrations = [];
  const db = {
    ...base,
    withTransactionAsync: async (task) => {
      // Migrations run inside transactions; capture the constraint state they see.
      foreignKeyStatesDuringMigrations.push(
        database.prepare("PRAGMA foreign_keys").get().foreign_keys
      );
      return base.withTransactionAsync(task);
    },
  };

  await initializeDatabaseSchema(db);

  // A future migration must be able to use SQLite's rename/copy/drop table
  // rebuild, which enforced foreign keys from entry_tags would block; the
  // pragma also cannot be toggled inside the migration's own transaction.
  assert.deepEqual(foreignKeyStatesDuringMigrations, [0]);
  assert.equal(database.prepare("PRAGMA foreign_keys").get().foreign_keys, 1);
});

test("identifies unreferenced media without false matches on prefixes or shared references", async () => {
  const database = new DatabaseSync(":memory:");
  const db = createAdapter(database);
  await initializeDatabaseSchema(db);

  // Entries store bare filenames; "prefix_shared-photo.jpg" must not count as a
  // reference to "shared-photo.jpg".
  database
    .prepare(
      `INSERT INTO entries (id, created_at, updated_at, images, audios, attachments)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run("entry-1", 1000, 1000, JSON.stringify(["shared-photo.jpg"]), null, null);

  database
    .prepare(
      `INSERT INTO entries (id, created_at, updated_at, images, audios, attachments)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      "entry-2",
      2000,
      2000,
      JSON.stringify(["prefix_shared-photo.jpg"]),
      JSON.stringify(["audio-note.m4a"]),
      JSON.stringify([{ uri: "document.pdf", name: "Doc" }])
    );

  // Mirrors filterUnreferencedMedia: a quoted-filename instr match across media columns.
  const checkReferenced = (filename) => {
    const needle = `"${filename}"`;
    return Boolean(
      database
        .prepare(
          `SELECT 1 FROM entries
            WHERE instr(images, ?) > 0
               OR instr(audios, ?) > 0
               OR instr(attachments, ?) > 0
            LIMIT 1`
        )
        .get(needle, needle, needle)
    );
  };

  assert.equal(checkReferenced("shared-photo.jpg"), true);
  assert.equal(checkReferenced("prefix_shared-photo.jpg"), true);
  assert.equal(checkReferenced("audio-note.m4a"), true);
  assert.equal(checkReferenced("document.pdf"), true);
  assert.equal(checkReferenced("deleted-photo.jpg"), false);

  // When entry-1 is deleted, shared-photo.jpg becomes unreferenced while entry-2 media remains referenced
  database.prepare("DELETE FROM entries WHERE id = ?").run("entry-1");
  assert.equal(checkReferenced("shared-photo.jpg"), false);
  assert.equal(checkReferenced("prefix_shared-photo.jpg"), true);
});
