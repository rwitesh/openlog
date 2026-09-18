import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  applyPendingRestore,
  completePendingRestore,
  queueRestore,
  readDurableTransaction,
  rollbackPendingRestore,
  saveDurableTransaction,
} from "../src/services/backup/restore.ts";
import {
  acquireExportGate,
  assertArchiveManifest,
  BACKUP_LIMITS,
  calculateRequiredRestoreBytes,
  DATABASE_SIZE_CEILING,
  extractMediaFilename,
  isExportGateActive,
  LIMITS,
  RESTORE_SAFETY_BUFFER_BYTES,
  releaseExportGate,
  validateArchivePath,
  waitForExportGate,
} from "../src/services/backup/shared.ts";
import { initializeDatabaseSchema, migrateRestoreSchema } from "../src/services/db/schema.ts";
import { validateAttachedDatabase } from "../src/services/db/validation.ts";

function createMemoryRestoreFileSystem(initialFiles = {}) {
  const files = new Map(Object.entries(initialFiles));
  const dirs = new Set(["/mock/doc", "/mock/db", "/mock/doc/media"]);
  const documentDirectory = "/mock/doc";
  const databaseDirectory = "/mock/db";

  return {
    files,
    dirs,
    documentDirectory,
    databaseDirectory,
    journalPath: `${documentDirectory}/openlog-restore-transaction.json`,
    journalBakPath: `${documentDirectory}/openlog-restore-transaction.bak`,
    journalTmpPath: `${documentDirectory}/openlog-restore-transaction.tmp`,
    exists: async (path) => files.has(path) || dirs.has(path),
    readText: async (path) => {
      const content = files.get(path);
      if (content === undefined) throw new Error(`File not found: ${path}`);
      return content;
    },
    writeText: async (path, content) => {
      files.set(path, content);
    },
    deleteFile: async (path) => {
      files.delete(path);
    },
    copyFile: async (source, destination) => {
      const content = files.get(source);
      if (content !== undefined) files.set(destination, content);
    },
    moveFile: async (source, destination) => {
      const content = files.get(source);
      if (content !== undefined) {
        files.set(destination, content);
        files.delete(source);
      }
    },
    directoryExists: async (path) => dirs.has(path),
    deleteDirectory: async (path) => {
      dirs.delete(path);
      const prefix = path.endsWith("/") ? path : `${path}/`;
      for (const file of Array.from(files.keys())) {
        if (file.startsWith(prefix) || file === path) files.delete(file);
      }
      for (const directory of Array.from(dirs)) {
        if (directory.startsWith(prefix) || directory === path) dirs.delete(directory);
      }
    },
    moveDirectory: async (source, destination) => {
      dirs.delete(source);
      dirs.add(destination);
      const sourcePrefix = source.endsWith("/") ? source : `${source}/`;
      const destinationPrefix = destination.endsWith("/") ? destination : `${destination}/`;
      for (const [file, content] of Array.from(files.entries())) {
        if (file.startsWith(sourcePrefix)) {
          files.set(destinationPrefix + file.slice(sourcePrefix.length), content);
          files.delete(file);
        }
      }
      for (const directory of Array.from(dirs)) {
        if (directory.startsWith(sourcePrefix)) {
          dirs.add(destinationPrefix + directory.slice(sourcePrefix.length));
          dirs.delete(directory);
        }
      }
    },
    listFiles: async (directory) => {
      const prefix = directory.endsWith("/") ? directory : `${directory}/`;
      const results = new Set();
      for (const path of [...files.keys(), ...dirs]) {
        if (!path.startsWith(prefix)) continue;
        const name = path.slice(prefix.length).split("/")[0];
        if (name) results.add(name);
      }
      return Array.from(results);
    },
  };
}

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

test("durable journal preserves the single next operation across writes", async () => {
  const fs = createMemoryRestoreFileSystem();

  // Initial state: no restore
  const initial = await readDurableTransaction(fs);
  assert.equal(initial.transaction, null);
  assert.equal(initial.corrupt, false);

  // Staged files must exist to queue restore
  fs.files.set("/mock/doc/openlog-restore-tx1.sqlite", "staged-db-content");
  fs.dirs.add("/mock/doc/openlog-restore-tx1-media");

  await queueRestore({ id: "tx1", entryCount: 42 }, fs);

  const prepared = await readDurableTransaction(fs);
  assert.equal(prepared.transaction?.id, "tx1");
  assert.equal(prepared.transaction?.operation, "preserve-db-main");
  assert.equal(prepared.transaction?.entryCount, 42);

  await saveDurableTransaction({ ...prepared.transaction, operation: "activate-db" }, fs);
  assert.equal(fs.files.has(fs.journalTmpPath), false);
  assert.ok(fs.files.has(fs.journalBakPath));
  assert.equal(JSON.parse(fs.files.get(fs.journalBakPath)).operation, "preserve-db-main");
  assert.equal(JSON.parse(fs.files.get(fs.journalPath)).operation, "activate-db");

  await saveDurableTransaction(
    { ...prepared.transaction, operation: "ready-for-verification" },
    fs
  );
  assert.equal(JSON.parse(fs.files.get(fs.journalBakPath)).operation, "activate-db");
  assert.equal(JSON.parse(fs.files.get(fs.journalPath)).operation, "ready-for-verification");
});

test("queued restore completes database and media swap", async () => {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "original-live-db",
    "/mock/db/app.db-wal": "original-live-wal",
    "/mock/doc/media/photo.jpg": "original-media-file",
    "/mock/doc/openlog-restore-p1.sqlite": "restored-db-content",
  });
  fs.dirs.add("/mock/doc/openlog-restore-p1-media");
  fs.files.set("/mock/doc/openlog-restore-p1-media/new-photo.jpg", "restored-media-file");

  await queueRestore({ id: "p1", entryCount: 15, mediaCount: 1 }, fs);
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

  // Verify the write-ahead restore reached verification.
  const journal = await readDurableTransaction(fs);
  assert.equal(journal.transaction?.operation, "ready-for-verification");
});

function createRestoreCrashFixture(id = "crash") {
  const fs = createMemoryRestoreFileSystem({
    "/mock/db/app.db": "original-live-db",
    "/mock/db/app.db-wal": "original-live-wal",
    "/mock/doc/media/original-photo.jpg": "original-media-file",
    [`/mock/doc/openlog-restore-${id}.sqlite`]: "restored-db-content",
  });
  fs.dirs.add(`/mock/doc/openlog-restore-${id}-media`);
  fs.files.set(`/mock/doc/openlog-restore-${id}-media/restored-photo.jpg`, "restored-media-file");
  return fs;
}

function crashAfterOperation(fs, targetOperation) {
  const originals = new Map();
  let operation = 0;
  for (const name of ["writeText", "moveFile", "moveDirectory"]) {
    const original = fs[name];
    originals.set(name, original);
    fs[name] = async (...args) => {
      await original(...args);
      if (name === "writeText" && args[0] !== fs.journalPath) return;
      operation += 1;
      if (operation === targetOperation) throw new Error(`simulated crash after ${name}`);
    };
  }
  return () => {
    for (const [name, original] of originals) fs[name] = original;
  };
}

test("write-ahead restore recovery survives a crash after every move and journal write", async () => {
  const baseline = createRestoreCrashFixture();
  await queueRestore({ id: "crash", entryCount: 1, mediaCount: 1 }, baseline);
  let operationCount = 0;
  for (const name of ["writeText", "moveFile", "moveDirectory"]) {
    const original = baseline[name];
    baseline[name] = async (...args) => {
      if (name === "writeText" && args[0] !== baseline.journalPath) {
        return await original(...args);
      }
      operationCount += 1;
      return await original(...args);
    };
  }
  assert.equal((await applyPendingRestore(baseline)).applied, true);
  assert.ok(operationCount > 0);

  for (
    let interruptedOperation = 1;
    interruptedOperation <= operationCount;
    interruptedOperation += 1
  ) {
    const fs = createRestoreCrashFixture();
    await queueRestore({ id: "crash", entryCount: 1, mediaCount: 1 }, fs);
    const disableCrash = crashAfterOperation(fs, interruptedOperation);
    await applyPendingRestore(fs);
    disableCrash();

    const recovered = await applyPendingRestore(fs);
    assert.equal(recovered.applied, true, `operation ${interruptedOperation}`);
    assert.equal(
      fs.files.get("/mock/db/openlog-restore-crash-previous.sqlite"),
      "original-live-db",
      `database recoverable after operation ${interruptedOperation}`
    );
    assert.equal(
      fs.files.get("/mock/db/openlog-restore-crash-previous.sqlite-wal"),
      "original-live-wal",
      `WAL recoverable after operation ${interruptedOperation}`
    );
    assert.equal(
      fs.files.get("/mock/doc/openlog-restore-crash-previous-media/original-photo.jpg"),
      "original-media-file",
      `media recoverable after operation ${interruptedOperation}`
    );

    await rollbackPendingRestore(fs);
    assert.equal(fs.files.get("/mock/db/app.db"), "original-live-db");
    assert.equal(fs.files.get("/mock/doc/media/original-photo.jpg"), "original-media-file");
  }
});

test("write-ahead rollback survives a crash after every move and journal write", async () => {
  const baseline = createRestoreCrashFixture("rollback-crash");
  await queueRestore({ id: "rollback-crash", entryCount: 1, mediaCount: 1 }, baseline);
  await applyPendingRestore(baseline);

  let operationCount = 0;
  for (const name of ["writeText", "moveFile", "moveDirectory"]) {
    const original = baseline[name];
    baseline[name] = async (...args) => {
      if (name === "writeText" && args[0] !== baseline.journalPath) {
        return await original(...args);
      }
      operationCount += 1;
      return await original(...args);
    };
  }
  await rollbackPendingRestore(baseline);
  assert.ok(operationCount > 0);

  for (
    let interruptedOperation = 1;
    interruptedOperation <= operationCount;
    interruptedOperation += 1
  ) {
    const fs = createRestoreCrashFixture("rollback-crash");
    await queueRestore({ id: "rollback-crash", entryCount: 1, mediaCount: 1 }, fs);
    await applyPendingRestore(fs);

    const disableCrash = crashAfterOperation(fs, interruptedOperation);
    await assert.rejects(() => rollbackPendingRestore(fs));
    disableCrash();

    await rollbackPendingRestore(fs);
    assert.equal(
      fs.files.get("/mock/db/app.db"),
      "original-live-db",
      `database recoverable after rollback operation ${interruptedOperation}`
    );
    assert.equal(
      fs.files.get("/mock/db/app.db-wal"),
      "original-live-wal",
      `WAL recoverable after rollback operation ${interruptedOperation}`
    );
    assert.equal(
      fs.files.get("/mock/doc/media/original-photo.jpg"),
      "original-media-file",
      `media recoverable after rollback operation ${interruptedOperation}`
    );
  }
});

test("corrupted journal recovers valid transaction from .bak or .tmp", async () => {
  const fs = createMemoryRestoreFileSystem();

  // Case 1: Corrupted .json, valid .bak
  fs.files.set(fs.journalPath, '{"id": "incomplete');
  fs.files.set(
    fs.journalBakPath,
    JSON.stringify({
      id: "rec1",
      operation: "preserve-db-main",
      originalDatabaseExists: true,
      originalMediaExists: true,
      entryCount: 8,
      mediaCount: 0,
      timestamp: 1,
    })
  );

  const recoveredBak = await readDurableTransaction(fs);
  assert.equal(recoveredBak.corrupt, false);
  assert.equal(recoveredBak.recovered, true);
  assert.equal(recoveredBak.transaction?.id, "rec1");
  assert.equal(recoveredBak.transaction?.operation, "preserve-db-main");
  assert.equal(recoveredBak.transaction?.entryCount, 8);
  // Primary .json should be repaired
  assert.equal(JSON.parse(fs.files.get(fs.journalPath)).id, "rec1");

  // Case 2: Corrupted .json and corrupted .bak, valid .tmp
  fs.files.set(fs.journalPath, "GARBAGE_JSON");
  fs.files.set(fs.journalBakPath, "{invalid");
  fs.files.set(
    fs.journalTmpPath,
    JSON.stringify({
      id: "rec2",
      operation: "ready-for-verification",
      originalDatabaseExists: true,
      originalMediaExists: true,
      entryCount: 12,
      mediaCount: 0,
      timestamp: 1,
    })
  );

  const recoveredTmp = await readDurableTransaction(fs);
  assert.equal(recoveredTmp.corrupt, false);
  assert.equal(recoveredTmp.recovered, true);
  assert.equal(recoveredTmp.transaction?.id, "rec2");
  assert.equal(recoveredTmp.transaction?.operation, "ready-for-verification");
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

  await saveDurableTransaction(
    {
      id: "fail",
      operation: "ready-for-verification",
      originalDatabaseExists: true,
      originalMediaExists: true,
      entryCount: 1,
      mediaCount: 1,
      timestamp: 1,
    },
    fs
  );

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

  await saveDurableTransaction(
    {
      id: "ok",
      operation: "ready-for-verification",
      originalDatabaseExists: true,
      originalMediaExists: true,
      entryCount: 99,
      mediaCount: 1,
      timestamp: 1,
    },
    fs
  );

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

  await saveDurableTransaction(
    {
      id: "nomedia",
      operation: "ready-for-verification",
      originalDatabaseExists: true,
      originalMediaExists: false,
      entryCount: 5,
      mediaCount: 0,
      timestamp: 1,
    },
    fs
  );

  await rollbackPendingRestore(fs);

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

test("restore schema gate accepts the current baseline and rejects unknown versions", async () => {
  const memDb = new DatabaseSync(":memory:");
  const target = createDbTarget(memDb);
  await initializeDatabaseSchema(target);

  // The v1 baseline is accepted before structural validation.
  await migrateRestoreSchema(target, "main");
  const count1 = await validateAttachedDatabase(target, "main");
  assert.equal(count1, 0);

  // A future schema is rejected rather than guessed at or downgraded.
  memDb.exec("PRAGMA user_version = 2;");
  await assert.rejects(
    () => migrateRestoreSchema(target, "main"),
    /Unsupported database version \(2\)/
  );

  // Restore archives must have a declared baseline version.
  memDb.exec("PRAGMA user_version = 0;");
  await assert.rejects(
    () => migrateRestoreSchema(target, "main"),
    /Unsupported database version \(0\)/
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
