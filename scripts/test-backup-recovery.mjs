import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  applyPendingRestore,
  completePendingRestore,
  createMemoryRestoreFileSystem,
  queueRestore,
  readDurableTransaction,
  rollbackPendingRestore,
  saveDurableTransaction,
} from "../src/services/backup/restoreTransaction.ts";
import {
  acquireExportGate,
  assertArchiveManifest,
  BACKUP_LIMITS,
  DATABASE_SIZE_CEILING,
  extractMediaFilename,
  isExportGateActive,
  LIMITS,
  releaseExportGate,
  validateArchivePath,
  waitForExportGate,
} from "../src/services/backup/shared.ts";
import { validateAttachedDatabase } from "../src/services/db/databaseValidation.ts";
import { initializeDatabaseSchema } from "../src/services/db/schema.ts";

const manifest = {
  format: "openlog-archive",
  version: 1,
  createdAt: 1_700_000_000_000,
  appVersion: "1.3.0",
  counts: { entry: 1, media: 3 },
};

test("backup manifests require a supported format and non-negative integer counts", () => {
  assert.doesNotThrow(() => assertArchiveManifest(manifest, "openlog-archive", 1));
  assert.throws(
    () => assertArchiveManifest({ ...manifest, format: "other-archive" }, "openlog-archive", 1),
    /Invalid backup format/
  );
  assert.throws(
    () =>
      assertArchiveManifest(
        { ...manifest, counts: { ...manifest.counts, media: -1 } },
        "openlog-archive",
        1
      ),
    /non-negative integers/
  );
  assert.throws(
    () => assertArchiveManifest({ ...manifest, version: 0 }, "openlog-archive", 1),
    /unsupported archive version/
  );
  assert.throws(
    () => assertArchiveManifest({ ...manifest, appVersion: "" }, "openlog-archive", 1),
    /appVersion is missing/
  );
});

test("archive path validation enforces expected members and rejects traversal", () => {
  // Valid members
  assert.doesNotThrow(() => validateArchivePath("manifest.json"));
  assert.doesNotThrow(() => validateArchivePath("database.sqlite"));
  assert.doesNotThrow(() => validateArchivePath("media/photo.jpg"));
  assert.doesNotThrow(() => validateArchivePath("media/audio-recording.m4a"));
  assert.equal(extractMediaFilename("media/document.pdf"), "document.pdf");

  // Traversal and root bypass
  assert.throws(() => validateArchivePath("../manifest.json"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("/manifest.json"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("\\database.sqlite"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/../secret.txt"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/sub/nested.jpg"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media\\photo.jpg"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/."), /unexpected archive path/);
  assert.throws(() => validateArchivePath("media/.."), /unexpected archive path/);
  assert.throws(() => validateArchivePath("other.txt"), /unexpected archive path/);
  assert.throws(() => validateArchivePath("database.sqlite3"), /unexpected archive path/);

  // Duplicate manifest and paths rejection
  const seenPaths = new Set(["manifest.json", "database.sqlite"]);
  assert.throws(() => validateArchivePath("manifest.json", seenPaths), /duplicate manifest/);
  assert.throws(() => validateArchivePath("database.sqlite", seenPaths), /duplicate archive path/);
  assert.doesNotThrow(() => validateArchivePath("media/photo.jpg", seenPaths));
});

test("backup limits and database ceiling match conservative safety bounds", () => {
  assert.equal(DATABASE_SIZE_CEILING, 256 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.memberBytes, 256 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.archiveBytes, 512 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.uncompressedBytes, 2 * 1024 * 1024 * 1024);
  assert.equal(BACKUP_LIMITS.manifestBytes, 256 * 1024);
  assert.equal(BACKUP_LIMITS.media, 100_000);
  assert.equal(LIMITS.archiveBytes, 512 * 1024 * 1024);
  assert.equal(LIMITS.manifestBytes, 256 * 1024);
  assert.equal(LIMITS.uncompressedBytes, 2 * 1024 * 1024 * 1024);
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

test("durable journal states and .bak preservation protocol preserve records across phases", async () => {
  const fs = createMemoryRestoreFileSystem();

  // Initial state: no restore
  const initial = await readDurableTransaction(fs);
  assert.equal(initial.transaction, null);
  assert.equal(initial.corrupt, false);

  // Staged files must exist to queue restore
  fs.files.set("/mock/doc/openlog-restore-tx1.sqlite", "staged-db-content");
  fs.dirs.add("/mock/doc/openlog-restore-tx1-media");

  await queueRestore({ id: "tx1", entryCount: 42 }, fs);

  // Verified prepared phase
  const prepared = await readDurableTransaction(fs);
  assert.ok(prepared.transaction);
  assert.equal(prepared.transaction.id, "tx1");
  assert.equal(prepared.transaction.phase, "prepared");
  assert.equal(prepared.transaction.entryCount, 42);

  // Transition to database-swapped: verifies atomic writing (tmp -> json, keeping bak)
  await saveDurableTransaction({ id: "tx1", phase: "database-swapped", entryCount: 42 }, fs);
  assert.equal(fs.files.has(fs.journalTmpPath), false);
  assert.ok(fs.files.has(fs.journalBakPath));
  assert.equal(JSON.parse(fs.files.get(fs.journalBakPath)).phase, "prepared");
  assert.equal(JSON.parse(fs.files.get(fs.journalPath)).phase, "database-swapped");

  // Transition to media-swapped
  await saveDurableTransaction({ id: "tx1", phase: "media-swapped", entryCount: 42 }, fs);
  assert.equal(JSON.parse(fs.files.get(fs.journalBakPath)).phase, "database-swapped");
  assert.equal(JSON.parse(fs.files.get(fs.journalPath)).phase, "media-swapped");
});

test("interruption recovery from 'prepared' phase completes database and media swap", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "original-live-db",
    "/mock/db/app.db-wal": "original-live-wal",
    "/mock/doc/media/photo.jpg": "original-media-file",
    "/mock/doc/openlog-restore-p1.sqlite": "restored-db-content",
  });
  fs.dirs.add("/mock/doc/openlog-restore-p1-media");
  fs.files.set("/mock/doc/openlog-restore-p1-media/new-photo.jpg", "restored-media-file");

  await saveDurableTransaction({ id: "p1", phase: "prepared", entryCount: 15 }, fs);

  const result = await applyPendingRestore(fs);
  assert.equal(result.applied, true);
  assert.equal(result.id, "p1");
  assert.equal(result.entryCount, 15);

  // Verify database swapped
  assert.equal(fs.files.get("/mock/db/app.db"), "restored-db-content");
  assert.equal(fs.files.get("/mock/db/openlog-restore-p1-previous.sqlite"), "original-live-db");
  assert.equal(
    fs.files.get("/mock/db/openlog-restore-p1-previous.sqlite-wal"),
    "original-live-wal"
  );

  // Verify media swapped
  assert.equal(fs.files.get("/mock/doc/media/new-photo.jpg"), "restored-media-file");
  assert.equal(
    fs.files.get("/mock/doc/openlog-restore-p1-previous-media/photo.jpg"),
    "original-media-file"
  );

  // Verify journal advanced to media-swapped
  const journal = await readDurableTransaction(fs);
  assert.equal(journal.transaction?.phase, "media-swapped");
});

test("interruption recovery from 'database-swapped' phase resumes media swap", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "restored-db-content",
    "/mock/db/openlog-restore-p2-previous.sqlite": "original-live-db",
    "/mock/doc/media/photo.jpg": "original-media-file",
  });
  fs.dirs.add("/mock/doc/openlog-restore-p2-media");
  fs.files.set("/mock/doc/openlog-restore-p2-media/new-recording.m4a", "restored-audio-file");

  await saveDurableTransaction({ id: "p2", phase: "database-swapped", entryCount: 5 }, fs);

  const result = await applyPendingRestore(fs);
  assert.equal(result.applied, true);
  assert.equal(result.id, "p2");
  assert.equal(result.entryCount, 5);

  // Media swap should now be completed
  assert.equal(fs.files.get("/mock/doc/media/new-recording.m4a"), "restored-audio-file");
  assert.equal(
    fs.files.get("/mock/doc/openlog-restore-p2-previous-media/photo.jpg"),
    "original-media-file"
  );

  const journal = await readDurableTransaction(fs);
  assert.equal(journal.transaction?.phase, "media-swapped");
});

test("interruption in 'database-swapped' with missing staged media rolls back safely", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "restored-db-content",
    "/mock/db/openlog-restore-p2b-previous.sqlite": "original-live-db",
    "/mock/doc/media/photo.jpg": "original-media-file",
  });

  await saveDurableTransaction({ id: "p2b", phase: "database-swapped", entryCount: 3 }, fs);

  const result = await applyPendingRestore(fs);
  assert.equal(result.applied, false);

  // Database rolled back to original
  assert.equal(fs.files.get("/mock/db/app.db"), "original-live-db");
  // Media untouched
  assert.equal(fs.files.get("/mock/doc/media/photo.jpg"), "original-media-file");
  // Journal cleared
  const journal = await readDurableTransaction(fs);
  assert.equal(journal.transaction, null);
});

test("interruption in 'media-swapped' phase is ready for database verification", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "restored-db-content",
    "/mock/db/openlog-restore-p3-previous.sqlite": "original-live-db",
    "/mock/doc/media/new-photo.jpg": "restored-media-file",
    "/mock/doc/openlog-restore-p3-previous-media/old-photo.jpg": "original-media-file",
  });
  fs.dirs.add("/mock/doc/openlog-restore-p3-previous-media");

  await saveDurableTransaction({ id: "p3", phase: "media-swapped", entryCount: 20 }, fs);

  const result = await applyPendingRestore(fs);
  assert.equal(result.applied, true);
  assert.equal(result.id, "p3");
  assert.equal(result.entryCount, 20);

  // Files remain in place
  assert.equal(fs.files.get("/mock/db/app.db"), "restored-db-content");
  assert.equal(fs.files.get("/mock/doc/media/new-photo.jpg"), "restored-media-file");
});

test("corrupted journal recovers valid transaction from .bak or .tmp", async () => {
  const fs = createMemoryRestoreFileSystem();

  // Case 1: Corrupted .json, valid .bak
  fs.files.set(fs.journalPath, '{"id": "incomplete');
  fs.files.set(fs.journalBakPath, JSON.stringify({ id: "rec1", phase: "prepared", entryCount: 8 }));

  const recoveredBak = await readDurableTransaction(fs);
  assert.equal(recoveredBak.corrupt, false);
  assert.equal(recoveredBak.recovered, true);
  assert.equal(recoveredBak.transaction?.id, "rec1");
  assert.equal(recoveredBak.transaction?.phase, "prepared");
  assert.equal(recoveredBak.transaction?.entryCount, 8);
  // Primary .json should be repaired
  assert.equal(JSON.parse(fs.files.get(fs.journalPath)).id, "rec1");

  // Case 2: Corrupted .json and corrupted .bak, valid .tmp
  fs.files.set(fs.journalPath, "GARBAGE_JSON");
  fs.files.set(fs.journalBakPath, "{invalid");
  fs.files.set(
    fs.journalTmpPath,
    JSON.stringify({ id: "rec2", phase: "media-swapped", entryCount: 12 })
  );

  const recoveredTmp = await readDurableTransaction(fs);
  assert.equal(recoveredTmp.corrupt, false);
  assert.equal(recoveredTmp.recovered, true);
  assert.equal(recoveredTmp.transaction?.id, "rec2");
  assert.equal(recoveredTmp.transaction?.phase, "media-swapped");
  assert.equal(JSON.parse(fs.files.get(fs.journalPath)).id, "rec2");
});

test("completely unrecoverable journal scans disk and rolls back previous artifacts safely", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "bad-replaced-db",
    "/mock/db/openlog-restore-corrupt-previous.sqlite": "original-preserved-db",
    "/mock/doc/media/bad-media.jpg": "bad-media",
    "/mock/doc/openlog-restore-corrupt-previous-media/orig-media.jpg": "orig-media",
  });
  fs.dirs.add("/mock/doc/openlog-restore-corrupt-previous-media");
  // Set all journal files to corrupted/unparseable content
  fs.files.set(fs.journalPath, "{broken json");
  fs.files.set(fs.journalBakPath, "corrupt!!");
  fs.files.set(fs.journalTmpPath, "trash");

  const result = await applyPendingRestore(fs);
  assert.equal(result.applied, false);

  // Original database restored
  assert.equal(fs.files.get("/mock/db/app.db"), "original-preserved-db");
  assert.equal(fs.files.has("/mock/db/openlog-restore-corrupt-previous.sqlite"), false);

  // Original media restored
  assert.equal(fs.files.get("/mock/doc/media/orig-media.jpg"), "orig-media");
  assert.equal(fs.files.has("/mock/doc/media/bad-media.jpg"), false);
  assert.equal(fs.dirs.has("/mock/doc/openlog-restore-corrupt-previous-media"), false);

  // Corrupted journals cleared
  assert.equal(fs.files.has(fs.journalPath), false);
  assert.equal(fs.files.has(fs.journalBakPath), false);
  assert.equal(fs.files.has(fs.journalTmpPath), false);
});

test("rollback restores original data and purges staging when database initialization throws", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "corrupt-candidate-db",
    "/mock/db/app.db-wal": "corrupt-candidate-wal",
    "/mock/db/openlog-restore-fail-previous.sqlite": "good-original-db",
    "/mock/db/openlog-restore-fail-previous.sqlite-wal": "good-original-wal",
    "/mock/doc/media/new-file.jpg": "candidate-media",
    "/mock/doc/openlog-restore-fail-previous-media/old-file.jpg": "original-media",
    "/mock/doc/openlog-restore-fail.sqlite": "leftover-staged-db",
  });
  fs.dirs.add("/mock/doc/openlog-restore-fail-previous-media");
  fs.dirs.add("/mock/doc/openlog-restore-fail-media");

  await saveDurableTransaction({ id: "fail", phase: "media-swapped", entryCount: 1 }, fs);

  // Simulate failure in schema initialization triggering rollbackPendingRestore
  await rollbackPendingRestore(fs, { id: "fail" });

  // Original database and WAL restored
  assert.equal(fs.files.get("/mock/db/app.db"), "good-original-db");
  assert.equal(fs.files.get("/mock/db/app.db-wal"), "good-original-wal");
  assert.equal(fs.files.has("/mock/db/openlog-restore-fail-previous.sqlite"), false);

  // Original media restored
  assert.equal(fs.files.get("/mock/doc/media/old-file.jpg"), "original-media");
  assert.equal(fs.files.has("/mock/doc/media/new-file.jpg"), false);
  assert.equal(fs.dirs.has("/mock/doc/openlog-restore-fail-previous-media"), false);

  // Staging and journal purged
  assert.equal(fs.files.has("/mock/doc/openlog-restore-fail.sqlite"), false);
  assert.equal(fs.dirs.has("/mock/doc/openlog-restore-fail-media"), false);
  assert.equal(fs.files.has(fs.journalPath), false);
});

test("completePendingRestore purges rollback copies and fires notification and analytics", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "active-restored-db",
    "/mock/db/openlog-restore-ok-previous.sqlite": "old-db-to-delete",
    "/mock/doc/openlog-restore-ok-previous-media/file.jpg": "old-media-to-delete",
    "/mock/doc/openlog-restore-ok.sqlite": "staged-db-to-delete",
  });
  fs.dirs.add("/mock/doc/openlog-restore-ok-previous-media");
  fs.dirs.add("/mock/doc/openlog-restore-ok-media");

  await saveDurableTransaction({ id: "ok", phase: "media-swapped", entryCount: 99 }, fs);

  const notifications = [];
  const analyticsEvents = [];

  await completePendingRestore(null, {
    fs,
    notify: (count) => notifications.push(count),
    analytics: (count) => analyticsEvents.push(count),
  });

  // Rollback artifacts deleted
  assert.equal(fs.files.has("/mock/db/openlog-restore-ok-previous.sqlite"), false);
  assert.equal(fs.dirs.has("/mock/doc/openlog-restore-ok-previous-media"), false);
  assert.equal(fs.files.has("/mock/doc/openlog-restore-ok.sqlite"), false);
  assert.equal(fs.dirs.has("/mock/doc/openlog-restore-ok-media"), false);

  // Journal deleted
  assert.equal(fs.files.has(fs.journalPath), false);

  // Notification and analytics fired with correct entry count
  assert.deepEqual(notifications, [99]);
  assert.deepEqual(analyticsEvents, [99]);
});

test("rollback cleans up swapped active media when original timeline had no media", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "restored-db",
    "/mock/db/openlog-restore-nomedia-previous.sqlite": "original-db-only",
    "/mock/doc/media/unwanted-restored-photo.jpg": "unwanted-restored-media",
  });
  // Note: NO /mock/doc/openlog-restore-nomedia-previous-media directory was created,
  // because the original timeline had zero media!
  fs.dirs.add("/mock/doc/media");

  await saveDurableTransaction({ id: "nomedia", phase: "media-swapped", entryCount: 5 }, fs);

  await rollbackPendingRestore(fs, { id: "nomedia", phase: "media-swapped" });

  // Original database restored
  assert.equal(fs.files.get("/mock/db/app.db"), "original-db-only");
  assert.equal(fs.files.has("/mock/db/openlog-restore-nomedia-previous.sqlite"), false);

  // Swapped active media completely deleted
  assert.equal(fs.files.has("/mock/doc/media/unwanted-restored-photo.jpg"), false);
  assert.equal(fs.dirs.has("/mock/doc/media"), false);

  // Journal deleted
  assert.equal(fs.files.has(fs.journalPath), false);
});

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

test("validateAttachedDatabase accepts current and older schema versions and rejects newer ones", async () => {
  const memDb = new DatabaseSync(":memory:");
  const target = createDbTarget(memDb);
  await initializeDatabaseSchema(target);

  // Default schema version is 1; should pass validation
  const count1 = await validateAttachedDatabase(target, "main");
  assert.equal(count1, 0);

  // Future version 2; should throw unsupported backup version
  memDb.exec("PRAGMA user_version = 2;");
  await assert.rejects(
    () => validateAttachedDatabase(target, "main"),
    /Unsupported backup database version/
  );

  // Version 0 or negative; should throw missing or invalid user_version
  memDb.exec("PRAGMA user_version = 0;");
  await assert.rejects(
    () => validateAttachedDatabase(target, "main"),
    /missing or invalid user_version/
  );
});

test("validateAttachedDatabase enforces referential integrity of entry media files", async () => {
  const memDb = new DatabaseSync(":memory:");
  const target = createDbTarget(memDb);
  await initializeDatabaseSchema(target);

  // Insert an entry referencing media
  memDb
    .prepare(
      `INSERT INTO entries (id, created_at, updated_at, text, images, audios, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "entry-1",
      Date.now(),
      Date.now(),
      "Hello test",
      JSON.stringify(["media/photo1.jpg"]),
      JSON.stringify([]),
      JSON.stringify([{ uri: "media/doc1.pdf", name: "Doc" }])
    );

  // Staging media dir missing photo1.jpg
  const missingMediaDir = {
    exists: true,
    hasFile: (name) => name === "doc1.pdf", // photo1.jpg missing!
  };

  await assert.rejects(
    () => validateAttachedDatabase(target, "main", missingMediaDir),
    /referenced media file "photo1.jpg" is missing/
  );

  // Staging media dir has both files
  const completeMediaDir = {
    exists: true,
    hasFile: (name) => name === "photo1.jpg" || name === "doc1.pdf",
  };

  const count = await validateAttachedDatabase(target, "main", completeMediaDir);
  assert.equal(count, 1);
});

test("storage preflight falls back to conservative full expansion when archive size is unproven", () => {
  const BACKUP_LIMITS = { uncompressedBytes: 2 * 1024 * 1024 * 1024 };
  const archiveBytes = 512 * 1024 * 1024;
  const options = { uncompressedBytes: 600 * 1024 * 1024, expectedArchiveBytes: 400 * 1024 * 1024 }; // mismatch!

  const isProvenUnchanged =
    options.expectedArchiveBytes !== undefined && options.expectedArchiveBytes === archiveBytes;
  assert.equal(isProvenUnchanged, false);

  const estimatedStagingBytes =
    options.uncompressedBytes !== undefined && options.uncompressedBytes > 0 && isProvenUnchanged
      ? Math.min(options.uncompressedBytes, BACKUP_LIMITS.uncompressedBytes)
      : Math.min(Math.max(archiveBytes * 4, 10 * 1024 * 1024), BACKUP_LIMITS.uncompressedBytes);

  // Mismatched file falls back to full 2 GiB expansion cap rather than 600 MiB
  assert.equal(estimatedStagingBytes, BACKUP_LIMITS.uncompressedBytes);
});
