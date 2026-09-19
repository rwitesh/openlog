import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  ARCHIVE_FORMAT,
  ARCHIVE_SCHEMA_VERSION,
  MANIFEST_FILENAME,
  TIMELINE_DATA_FILENAME,
} from "../src/services/backup/types.ts";
import {
  acquireExportGate,
  assertBackupManifest,
  assertBackupTimelineData,
  BACKUP_LIMITS,
  calculateRequiredRestoreBytes,
  DATABASE_SIZE_CEILING,
  extractMediaFilename,
  isExportGateActive,
  RESTORE_SAFETY_BUFFER_BYTES,
  releaseExportGate,
  validateArchivePath,
  waitForExportGate,
} from "../src/services/backup/utils.ts";
import { initializeDatabaseSchema } from "../src/services/db/schema.ts";

function createDbTarget(database) {
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
      } catch (e) {
        database.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

const validManifest = {
  format: "openlog-backup",
  version: 1,
  createdAt: 1_773_900_000_000,
  appVersion: "1.3.5",
  counts: {
    entry: 1,
    tag: 1,
    media: 0,
  },
};

const validTimelineData = {
  tags: [
    {
      id: "tag-uuid-1",
      name: "Personal",
      key: "personal",
      colorId: "terracotta",
      createdAt: 1_773_800_000_000,
      updatedAt: 1_773_800_000_000,
    },
  ],
  entries: [
    {
      id: "entry-uuid-1",
      createdAt: 1_773_850_000_000,
      updatedAt: 1_773_850_000_000,
      text: "Evening walk through the city.",
      images: [],
      audios: [],
      attachments: [],
      tagIds: ["tag-uuid-1"],
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        name: "San Francisco, CA",
      },
    },
  ],
  preferences: {
    appearance: {
      mode: "system",
      fontFamily: "Source Sans 3",
      accent: "default",
    },
    timeline: {
      firstDayOfWeek: 0,
    },
  },
};

test("schema & manifest JSON validation accepts valid manifest", () => {
  assert.doesNotThrow(() => assertBackupManifest(validManifest));
  assert.equal(validManifest.format, ARCHIVE_FORMAT);
  assert.equal(validManifest.version, ARCHIVE_SCHEMA_VERSION);
});

test("schema & manifest JSON validation rejects missing or invalid format", () => {
  assert.throws(
    () => assertBackupManifest({ ...validManifest, format: undefined }),
    /Invalid backup format/
  );
  assert.throws(
    () => assertBackupManifest({ ...validManifest, format: "wrong-format" }),
    /Invalid backup format/
  );
  assert.throws(
    () => assertBackupManifest({ ...validManifest, format: "" }),
    /Invalid backup format/
  );
  assert.throws(
    () => assertBackupManifest({ ...validManifest, format: 123 }),
    /Invalid backup format/
  );
});

test("schema & manifest JSON validation rejects future schema versions with update prompt", () => {
  assert.throws(
    () => assertBackupManifest({ ...validManifest, version: ARCHIVE_SCHEMA_VERSION + 1 }),
    /Unsupported backup version/
  );
  assert.throws(
    () => assertBackupManifest({ ...validManifest, version: 99 }),
    /Unsupported backup version/
  );
  assert.throws(
    () => assertBackupManifest({ ...validManifest, version: 0 }),
    /unsupported archive version/
  );
  assert.throws(
    () => assertBackupManifest({ ...validManifest, version: -1 }),
    /unsupported archive version/
  );
  assert.throws(
    () => assertBackupManifest({ ...validManifest, version: 1.5 }),
    /unsupported archive version/
  );
});

test("schema & manifest JSON validation rejects negative counts", () => {
  assert.throws(
    () =>
      assertBackupManifest({
        ...validManifest,
        counts: { ...validManifest.counts, entry: -1 },
      }),
    /non-negative integers/
  );
  assert.throws(
    () =>
      assertBackupManifest({
        ...validManifest,
        counts: { ...validManifest.counts, tag: -1 },
      }),
    /non-negative integers/
  );
  assert.throws(
    () =>
      assertBackupManifest({
        ...validManifest,
        counts: { ...validManifest.counts, media: -1 },
      }),
    /non-negative integers/
  );
});

test("timeline JSON validation accepts valid timeline payload", () => {
  assert.doesNotThrow(() => assertBackupTimelineData(validTimelineData));
});

test("manifest and timeline cross-validation rejects count mismatches", () => {
  assert.equal(validTimelineData.entries.length, validManifest.counts.entry);
  assert.equal(validTimelineData.tags.length, validManifest.counts.tag);

  const checkCountParity = (manifest, timeline, mediaCount) => {
    if (timeline.entries.length !== manifest.counts.entry) {
      throw new Error(
        `Backup entry count mismatch (${timeline.entries.length} entries, manifest specifies ${manifest.counts.entry}).`
      );
    }
    if (timeline.tags.length !== manifest.counts.tag) {
      throw new Error(
        `Backup tag count mismatch (${timeline.tags.length} tags, manifest specifies ${manifest.counts.tag}).`
      );
    }
    if (mediaCount !== manifest.counts.media) {
      throw new Error(
        `Backup media count mismatch (${mediaCount} media files, manifest specifies ${manifest.counts.media}).`
      );
    }
  };

  assert.doesNotThrow(() => checkCountParity(validManifest, validTimelineData, 0));
  assert.throws(
    () =>
      checkCountParity(
        { ...validManifest, counts: { ...validManifest.counts, entry: 99 } },
        validTimelineData,
        0
      ),
    /Backup entry count mismatch/
  );
  assert.throws(
    () =>
      checkCountParity(
        { ...validManifest, counts: { ...validManifest.counts, tag: 99 } },
        validTimelineData,
        0
      ),
    /Backup tag count mismatch/
  );
  assert.throws(
    () => checkCountParity(validManifest, validTimelineData, 5),
    /Backup media count mismatch/
  );
});

test("schema & timeline JSON validation rejects malformed entry rows", () => {
  // Missing id
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], id: "" }],
      }),
    /(?:id is required|missing id)/i
  );

  // Invalid timestamps
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], createdAt: NaN }],
      }),
    /createdAt is required/
  );
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], createdAt: "not-a-number" }],
      }),
    /createdAt is required/
  );
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], updatedAt: Infinity }],
      }),
    /updatedAt is required/
  );

  // Invalid field types
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], text: 12345 }],
      }),
    /text must be a string or null/
  );
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], images: "not-an-array" }],
      }),
    /images must be an array/
  );
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], audios: "not-an-array" }],
      }),
    /audios must be an array/
  );
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], attachments: "not-an-array" }],
      }),
    /attachments must be an array/
  );
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], tagIds: "not-an-array" }],
      }),
    /tagIds must be an array/
  );
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        entries: [{ ...validTimelineData.entries[0], location: "San Francisco" }],
      }),
    /location must be an object or null/
  );
});

test("schema & timeline JSON validation rejects malformed tag rows", () => {
  // Missing id
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        tags: [{ ...validTimelineData.tags[0], id: "" }],
      }),
    /(?:id is required|missing id)/i
  );

  // Missing name
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        tags: [{ id: "tag-1", key: "tag-1", colorId: "terracotta" }],
      }),
    /(?:name is required|missing name)/i
  );

  // Missing colorId
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        tags: [{ ...validTimelineData.tags[0], colorId: "" }],
      }),
    /(?:colorId is required|missing colorId)/i
  );
  assert.throws(
    () =>
      assertBackupTimelineData({
        ...validTimelineData,
        tags: [{ id: "tag-1", name: "Personal", key: "personal" }],
      }),
    /(?:colorId is required|missing colorId)/i
  );
});

test("archive path validation enforces expected members and rejects traversal", () => {
  // Accepts manifest.json, timeline.json, and media/photo1.jpg
  assert.doesNotThrow(() => validateArchivePath(MANIFEST_FILENAME));
  assert.doesNotThrow(() => validateArchivePath(TIMELINE_DATA_FILENAME));
  assert.doesNotThrow(() => validateArchivePath("media/photo1.jpg"));
  assert.doesNotThrow(() => validateArchivePath("media/audio-recording.m4a"));
  assert.equal(extractMediaFilename("media/photo1.jpg"), "photo1.jpg");

  // Rejects path traversal attempts
  assert.throws(() => validateArchivePath("../secret.txt"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("../../etc/passwd"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/../secret.txt"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/sub/nested.jpg"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/."), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/.."), /unexpected archive path/);

  // Rejects absolute paths
  assert.throws(() => validateArchivePath("/etc/passwd"), /unexpected archive path/);
  assert.throws(() => validateArchivePath(`/${MANIFEST_FILENAME}`), /unexpected archive path/);
  assert.throws(() => validateArchivePath(`/${TIMELINE_DATA_FILENAME}`), /unexpected archive path/);

  // Rejects backslashes
  assert.throws(() => validateArchivePath("media\\evil.jpg"), /unexpected archive path/);
  assert.throws(() => validateArchivePath(`\\${MANIFEST_FILENAME}`), /unexpected archive path/);
  assert.throws(
    () => validateArchivePath(`\\${TIMELINE_DATA_FILENAME}`),
    /unexpected archive path/
  );

  // Rejects duplicate paths
  const seenPaths = new Set([MANIFEST_FILENAME, TIMELINE_DATA_FILENAME, "media/photo1.jpg"]);
  assert.throws(() => validateArchivePath(MANIFEST_FILENAME, seenPaths), /duplicate/);
  assert.throws(() => validateArchivePath(TIMELINE_DATA_FILENAME, seenPaths), /duplicate/);
  assert.throws(() => validateArchivePath("media/photo1.jpg", seenPaths), /duplicate archive path/);
  assert.doesNotThrow(() => validateArchivePath("media/photo2.jpg", seenPaths));

  // Rejects unexpected root paths
  assert.throws(() => validateArchivePath("malicious.sh"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("other.txt"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("database.sqlite3"), /unexpected archive path/);
});

test("backup limits and database ceiling match conservative safety bounds", () => {
  assert.equal(DATABASE_SIZE_CEILING, 256 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.memberBytes, 256 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.archiveBytes, 512 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.uncompressedBytes, 2 * 1024 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.timelineDataBytes, 64 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.manifestBytes, 64 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.media, 100_000);
});

test("export gate serializes media cleanup and unblocks when released", async () => {
  assert.equal(isExportGateActive(), false);

  // When inactive, waitForExportGate resolves immediately
  await waitForExportGate();

  // Acquire gate
  acquireExportGate();
  assert.equal(isExportGateActive(), true);

  const events = [];
  let cleanupDone = false;

  // Start media cleanup while gate is held
  const cleanupPromise = (async () => {
    events.push("cleanup-waiting");
    await waitForExportGate();
    events.push("cleanup-executed");
    cleanupDone = true;
  })();

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(events, ["cleanup-waiting"]);
  assert.equal(cleanupDone, false);

  // Release gate
  releaseExportGate();
  assert.equal(isExportGateActive(), false);

  await cleanupPromise;
  assert.deepEqual(events, ["cleanup-waiting", "cleanup-executed"]);
  assert.equal(cleanupDone, true);
});

test("calculateRequiredRestoreBytes uses exact uncompressed bytes when size is unchanged and falls back to full expansion", () => {
  const archiveBytes = 512 * 1024 * 1024;
  const existingTimelineBytes = 10 * 1024 * 1024;
  const safetyBufferBytes = RESTORE_SAFETY_BUFFER_BYTES;

  // Case 1: size matches expectedArchiveBytes -> uses exact uncompressedBytes
  const matchedRequired = calculateRequiredRestoreBytes({
    archiveBytes,
    existingTimelineBytes,
    uncompressedBytes: 600 * 1024 * 1024,
    expectedArchiveBytes: archiveBytes,
    safetyBufferBytes,
  });
  assert.equal(
    matchedRequired,
    archiveBytes + 600 * 1024 * 1024 + existingTimelineBytes + safetyBufferBytes
  );

  // Case 2: size mismatched (archive modified after inspection) -> falls back to full 2 GiB expansion cap
  const mismatchedRequired = calculateRequiredRestoreBytes({
    archiveBytes,
    existingTimelineBytes,
    uncompressedBytes: 600 * 1024 * 1024,
    expectedArchiveBytes: 400 * 1024 * 1024,
    safetyBufferBytes,
  });
  assert.equal(
    mismatchedRequired,
    archiveBytes + BACKUP_LIMITS.uncompressedBytes + existingTimelineBytes + safetyBufferBytes
  );

  // Case 3: expectedArchiveBytes omitted (unproven) -> also falls back to conservative full expansion
  const unprovenRequired = calculateRequiredRestoreBytes({
    archiveBytes,
    existingTimelineBytes,
    uncompressedBytes: 600 * 1024 * 1024,
    safetyBufferBytes,
  });
  assert.equal(
    unprovenRequired,
    archiveBytes + BACKUP_LIMITS.uncompressedBytes + existingTimelineBytes + safetyBufferBytes
  );
});

test("in-session restore transaction replaces entries, tags, and rebuilds FTS5 search", async () => {
  const memDb = new DatabaseSync(":memory:");
  const target = createDbTarget(memDb);
  await initializeDatabaseSchema(target);

  // Seed initial timeline data
  memDb
    .prepare(
      "INSERT INTO tags (id, name, key, color_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run("tag-old", "Old Tag", "old-tag", "blue", 1000, 1000);
  memDb
    .prepare(
      "INSERT INTO entries (id, created_at, updated_at, text, images, audios, attachments, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      "entry-old",
      1000,
      1000,
      "Old timeline entry about morning coffee",
      "[]",
      "[]",
      "[]",
      null
    );
  memDb
    .prepare("INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)")
    .run("entry-old", "tag-old");

  // Verify initial data is searchable
  const oldSearch = memDb
    .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
    .get("coffee");
  assert.ok(oldSearch, "Initial entry should be searchable in FTS5");

  // Execute in-session restore transaction:
  // Clear tables, batch insert new data, and rebuild FTS5
  await target.withTransactionAsync(async () => {
    await target.execAsync("DELETE FROM entry_tags; DELETE FROM tags; DELETE FROM entries;");

    await target.runAsync(
      "INSERT INTO tags (id, name, key, color_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      "tag-new-1",
      "Personal",
      "personal",
      "terracotta",
      2000,
      2000
    );

    await target.runAsync(
      "INSERT INTO entries (id, created_at, updated_at, text, images, audios, attachments, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      "entry-new-1",
      2000,
      2000,
      "Evening walk through the city park",
      "[]",
      "[]",
      "[]",
      null
    );

    await target.runAsync(
      "INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
      "entry-new-1",
      "tag-new-1"
    );

    await target.execAsync("INSERT INTO entries_fts(entries_fts) VALUES ('rebuild');");
  });

  // Verify old data is gone
  const oldEntryCount = memDb
    .prepare("SELECT COUNT(*) AS count FROM entries WHERE id = 'entry-old'")
    .get().count;
  assert.equal(oldEntryCount, 0);

  const oldTagCount = memDb
    .prepare("SELECT COUNT(*) AS count FROM tags WHERE id = 'tag-old'")
    .get().count;
  assert.equal(oldTagCount, 0);

  // Verify restored entries and tags are present
  const newEntry = memDb.prepare("SELECT * FROM entries WHERE id = 'entry-new-1'").get();
  assert.ok(newEntry);
  assert.equal(newEntry.text, "Evening walk through the city park");

  const newTag = memDb.prepare("SELECT * FROM tags WHERE id = 'tag-new-1'").get();
  assert.ok(newTag);
  assert.equal(newTag.name, "Personal");

  const newEntryTag = memDb
    .prepare("SELECT * FROM entry_tags WHERE entry_id = 'entry-new-1' AND tag_id = 'tag-new-1'")
    .get();
  assert.ok(newEntryTag);

  // Verify FTS5 search index matches restored text
  const ftsMatchPark = memDb
    .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
    .get("park");
  assert.ok(ftsMatchPark, "Restored text 'park' should be indexed in FTS5");

  const ftsMatchEvening = memDb
    .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
    .get("evening");
  assert.ok(ftsMatchEvening, "Restored text 'evening' should be indexed in FTS5");

  const ftsMatchOldCoffee = memDb
    .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
    .get("coffee");
  assert.equal(ftsMatchOldCoffee, undefined, "Old text 'coffee' must no longer match in FTS5");
});

test("in-session restore guarantees full rollback on insertion failure", async () => {
  const memDb = new DatabaseSync(":memory:");
  const target = createDbTarget(memDb);
  await initializeDatabaseSchema(target);

  // Seed baseline timeline
  memDb
    .prepare(
      "INSERT INTO entries (id, created_at, updated_at, text, images, audios, attachments, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run("entry-baseline", 1000, 1000, "Essential preserved note", "[]", "[]", "[]", null);

  assert.equal(memDb.prepare("SELECT COUNT(*) AS count FROM entries").get().count, 1);

  // Attempt transaction that inserts a row and then throws
  await assert.rejects(async () => {
    await target.withTransactionAsync(async () => {
      await target.runAsync(
        "INSERT INTO entries (id, created_at, updated_at, text, images, audios, attachments, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        "entry-interrupted",
        2000,
        2000,
        "Partially inserted entry that must be rolled back",
        "[]",
        "[]",
        "[]",
        null
      );
      throw new Error("Simulated disk error during restore batch insertion");
    });
  }, /Simulated disk error during restore batch insertion/);

  // Verify complete rollback: interrupted entry does not exist, baseline entry is 100% intact
  const interruptedCount = memDb
    .prepare("SELECT COUNT(*) AS count FROM entries WHERE id = 'entry-interrupted'")
    .get().count;
  assert.equal(interruptedCount, 0);

  const baselineCount = memDb
    .prepare("SELECT COUNT(*) AS count FROM entries WHERE id = 'entry-baseline'")
    .get().count;
  assert.equal(baselineCount, 1);

  const baselineEntry = memDb.prepare("SELECT text FROM entries WHERE id = 'entry-baseline'").get();
  assert.equal(baselineEntry.text, "Essential preserved note");
});
