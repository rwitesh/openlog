import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { replaceTimelineData } from "../src/services/backup/import/timeline.ts";
import { assertBackupTimelineData } from "../src/services/backup/utils/index.ts";
import { initializeDatabaseSchema } from "../src/services/db/schema.ts";
import { parseAttachments } from "../src/services/db/uris.ts";

function createAdapter(database) {
  return {
    execAsync: async (source) => database.exec(source),
    runAsync: async (source, ...params) => database.prepare(source).run(...params),
    getFirstAsync: async (source, ...params) => database.prepare(source).get(...params) ?? null,
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

function validTimeline() {
  return {
    tags: [
      { id: "tag-1", name: "Garden", key: "garden", colorId: "sage", createdAt: 1, updatedAt: 1 },
      { id: "tag-2", name: "Music", key: "music", colorId: "teal", createdAt: 2, updatedAt: 2 },
    ],
    entries: [
      {
        id: "entry-1",
        createdAt: 10,
        updatedAt: 11,
        text: "Planted tomatoes",
        images: ["a.jpg"],
        attachments: [
          { uri: "plan.pdf", name: "Plan.pdf", size: 2048, mimeType: "application/pdf" },
        ],
        tagIds: ["tag-1", "tag-2"],
        location: { latitude: 30.2, longitude: -97.7, name: "Austin" },
      },
      { id: "entry-2", createdAt: 20, updatedAt: 20, text: null },
    ],
    settings: { theme: "dark" },
  };
}

function rejects(mutate, message) {
  const timeline = validTimeline();
  mutate(timeline);
  assert.throws(() => assertBackupTimelineData(timeline), { message });
}

test("assertBackupTimelineData accepts a well-formed timeline", () => {
  assert.doesNotThrow(() => assertBackupTimelineData(validTimeline()));
});

test("assertBackupTimelineData rejects tags the database could not hold", () => {
  rejects((t) => {
    t.tags[0].id = "";
  }, "Invalid backup tag: missing id.");
  rejects((t) => {
    delete t.tags[1].id;
  }, "Invalid backup tag: missing id.");
  rejects((t) => {
    t.tags[1].id = "tag-1";
  }, "Invalid backup tag: duplicate id.");
  rejects((t) => {
    t.tags[1].key = "garden";
  }, "Invalid backup tag: duplicate name.");
});

test("assertBackupTimelineData rejects entries with broken identity or tag references", () => {
  rejects((t) => {
    t.entries[1].id = "entry-1";
  }, "Invalid backup entry: duplicate id.");
  rejects((t) => {
    t.entries[0].tagIds = ["tag-missing"];
  }, "Invalid backup entry: tagIds must reference backup tags.");
  rejects((t) => {
    t.entries[0].tagIds = ["tag-1", "tag-1"];
  }, "Invalid backup entry: duplicate tag.");
});

test("assertBackupTimelineData rejects media references that are not bare filenames", () => {
  rejects((t) => {
    t.entries[0].images = ["../app.db"];
  }, "Invalid backup entry: images must be media filenames.");
  rejects((t) => {
    t.entries[0].attachments[0].uri = "nested/plan.pdf";
  }, "Invalid backup entry: attachment uris must be media filenames.");
});

test("assertBackupTimelineData rejects a non-string attachment type", () => {
  rejects((t) => {
    t.entries[0].attachments[0].mimeType = 42;
  }, "Invalid backup entry: attachment types must be strings.");
  const withoutType = validTimeline();
  delete withoutType.entries[0].attachments[0].mimeType;
  assert.doesNotThrow(() => assertBackupTimelineData(withoutType));
});

test("assertBackupTimelineData rejects settings that are not string maps", () => {
  rejects((t) => {
    t.settings = { theme: 1 };
  }, "Invalid backup timeline: settings values must be strings.");
  rejects((t) => {
    t.settings = ["dark"];
  }, "Invalid backup timeline: settings must be an object.");
});

test("replaceTimelineData restores attachment types in the shape the app reads", async () => {
  const database = new DatabaseSync(":memory:");
  const db = createAdapter(database);
  await initializeDatabaseSchema(db);
  const timeline = validTimeline();
  assertBackupTimelineData(timeline);

  await replaceTimelineData(db, timeline);

  const row = database.prepare("SELECT attachments FROM entries WHERE id = 'entry-1'").get();
  assert.deepEqual(parseAttachments(row.attachments), [
    { uri: "plan.pdf", name: "Plan.pdf", mime: "application/pdf", size: 2048 },
  ]);
  assert.deepEqual(Object.keys(JSON.parse(row.attachments)[0]).sort(), [
    "mime",
    "name",
    "size",
    "uri",
  ]);
});

test("replaceTimelineData keeps the existing timeline when the restore fails", async () => {
  const database = new DatabaseSync(":memory:");
  const db = createAdapter(database);
  await initializeDatabaseSchema(db);
  await replaceTimelineData(db, validTimeline());

  const unvalidated = validTimeline();
  unvalidated.entries[1].id = "entry-1";
  unvalidated.entries[0].text = "Replacement";
  await assert.rejects(replaceTimelineData(db, unvalidated));

  const rows = database.prepare("SELECT id, text FROM entries ORDER BY id").all();
  assert.deepEqual(
    rows.map((row) => ({ ...row })),
    [
      { id: "entry-1", text: "Planted tomatoes" },
      { id: "entry-2", text: null },
    ]
  );
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM entry_tags").get().count, 2);
  assert.equal(
    database.prepare("SELECT value FROM settings WHERE key = 'theme'").get().value,
    "dark"
  );
});

test("parseAttachments reads the type from rows restored before the mapping", () => {
  const legacy = JSON.stringify([
    { uri: "plan.pdf", name: "Plan.pdf", size: 2048, mimeType: "application/pdf" },
  ]);
  assert.equal(parseAttachments(legacy)[0].mime, "application/pdf");
});
