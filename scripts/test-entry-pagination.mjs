import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { buildPagedEntryQuery } from "../src/services/db/pagination.ts";
import { initializeDatabaseSchema } from "../src/services/db/schema.ts";

const COLUMNS = "id, created_at";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE entries (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)");
  const insert = database.prepare("INSERT INTO entries (id, created_at) VALUES (?, ?)");
  for (const [id, createdAt] of [
    ["e", 300],
    ["d", 300],
    ["c", 200],
    ["b", 200],
    ["a", 100],
  ]) {
    insert.run(id, createdAt);
  }
  return database;
}

function page(database, options) {
  const { query, params, limit } = buildPagedEntryQuery(COLUMNS, options);
  const rows = database.prepare(query).all(...params, limit + 1);
  return {
    ids: rows.slice(0, limit).map((row) => row.id),
    hasMore: rows.length > limit,
  };
}

test("entry cursor pagination has a stable total order with no duplicate or skipped ties", () => {
  const database = createDatabase();
  const first = page(database, { limit: 2 });
  const second = page(database, { cursor: { createdAt: 300, id: "d" }, limit: 2 });
  const third = page(database, { cursor: { createdAt: 200, id: "b" }, limit: 2 });

  assert.deepEqual(first, { ids: ["e", "d"], hasMore: true });
  assert.deepEqual(second, { ids: ["c", "b"], hasMore: true });
  assert.deepEqual(third, { ids: ["a"], hasMore: false });
  assert.deepEqual([...first.ids, ...second.ids, ...third.ids], ["e", "d", "c", "b", "a"]);
});

test("entry pagination applies the requested day bounds after its cursor", () => {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE entries (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)");
  const day = new Date(2026, 8, 6).getTime();
  const insert = database.prepare("INSERT INTO entries (id, created_at) VALUES (?, ?)");
  insert.run("today-new", day + 20);
  insert.run("today-old", day + 10);
  insert.run("tomorrow", day + 24 * 60 * 60 * 1000 + 10);

  assert.deepEqual(page(database, { dayTs: day, limit: 1 }), {
    ids: ["today-new"],
    hasMore: true,
  });
  assert.deepEqual(
    page(database, { dayTs: day, cursor: { createdAt: day + 20, id: "today-new" } }),
    {
      ids: ["today-old"],
      hasMore: false,
    }
  );
});

async function createTaggedDatabase() {
  const database = new DatabaseSync(":memory:");
  await initializeDatabaseSchema({
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
  });

  const day = new Date(2026, 8, 6).getTime();
  const nextDay = day + 24 * 60 * 60 * 1000;
  const insertEntry = database.prepare(
    "INSERT INTO entries (id, created_at, updated_at) VALUES (?, ?, ?)"
  );
  for (const [id, createdAt] of [
    ["e", nextDay + 30],
    ["d", nextDay + 20],
    ["c", day + 30],
    ["b", day + 20],
    ["a", day + 10],
  ]) {
    insertEntry.run(id, createdAt, createdAt);
  }
  const insertTag = database.prepare(
    "INSERT INTO tags (id, name, key, color_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insertTag.run("work", "Work", "work", "clay", 1, 1);
  insertTag.run("home", "Home", "home", "sage", 1, 1);
  const link = database.prepare("INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)");
  for (const [entryId, tagId] of [
    ["e", "work"],
    ["d", "home"],
    ["c", "work"],
    ["c", "home"],
    ["a", "work"],
  ]) {
    link.run(entryId, tagId);
  }
  return { database, day };
}

test("entry pagination keeps only entries carrying the requested tag across pages", async () => {
  const { database, day } = await createTaggedDatabase();
  const first = page(database, { tagId: "work", limit: 2 });
  const second = page(database, {
    tagId: "work",
    cursor: { createdAt: day + 30, id: "c" },
    limit: 2,
  });

  assert.deepEqual(first, { ids: ["e", "c"], hasMore: true });
  assert.deepEqual(second, { ids: ["a"], hasMore: false });
});

test("entry pagination combines a tag with day bounds", async () => {
  const { database, day } = await createTaggedDatabase();

  assert.deepEqual(page(database, { tagId: "work", dayTs: day }).ids, ["c", "a"]);
  assert.deepEqual(page(database, { tagId: "home", dayTs: day }).ids, ["c"]);
});

test("entry pagination returns nothing for a deleted tag", async () => {
  const { database } = await createTaggedDatabase();
  database.prepare("DELETE FROM tags WHERE id = ?").run("work");

  assert.deepEqual(page(database, { tagId: "work" }).ids, []);
  assert.deepEqual(page(database, {}).ids, ["e", "d", "c", "b", "a"]);
});
