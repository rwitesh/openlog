import assert from "node:assert/strict";
import { register } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

// expo-file-system is replaced with an in-memory stand-in that keeps file contents and open
// handles, so export, import and inspect run end to end in Node with the real fflate archive code.
const fakeFileSystem = `
const fs = (globalThis.__fakeFs ??= { files: new Map(), dirs: new Set(), openHandles: new Set(), onRead: null });
function join(parts) {
  return parts
    .map((part) => (typeof part === "string" ? part : part.uri))
    .reduce((base, part) => (base ? base.replace(/\\/$/, "") + "/" + part.replace(/^\\//, "") : part), "");
}
export const FileMode = { ReadOnly: "r", WriteOnly: "w" };
export class Directory {
  constructor(...parts) { this.uri = join(parts); }
  get exists() { return fs.dirs.has(this.uri); }
  create() { fs.dirs.add(this.uri); }
  delete() {
    const prefix = this.uri + "/";
    for (const uri of [...fs.files.keys()]) if (uri.startsWith(prefix)) fs.files.delete(uri);
    for (const uri of [...fs.dirs]) if (uri === this.uri || uri.startsWith(prefix)) fs.dirs.delete(uri);
  }
  list() {
    const prefix = this.uri + "/";
    return [...fs.files.keys()]
      .filter((uri) => uri.startsWith(prefix) && !uri.slice(prefix.length).includes("/"))
      .map((uri) => new File(uri));
  }
}
export class File {
  constructor(...parts) { this.uri = join(parts); }
  get name() { return this.uri.slice(this.uri.lastIndexOf("/") + 1); }
  get exists() { return fs.files.has(this.uri); }
  get size() { return fs.files.get(this.uri)?.length ?? 0; }
  info() { return { exists: this.exists, size: this.size }; }
  create() { fs.files.set(this.uri, new Uint8Array(0)); }
  delete() { fs.files.delete(this.uri); }
  async move(destination) {
    fs.files.set(destination.uri, fs.files.get(this.uri));
    fs.files.delete(this.uri);
    this.uri = destination.uri;
  }
  open() {
    const uri = this.uri;
    const name = this.name;
    let position = 0;
    const handle = {
      size: fs.files.get(uri)?.length ?? 0,
      readBytes(length) {
        fs.onRead?.(name);
        const bytes = fs.files.get(uri) ?? new Uint8Array(0);
        const chunk = bytes.slice(position, position + length);
        position += chunk.length;
        return chunk;
      },
      writeBytes(chunk) {
        const bytes = fs.files.get(uri);
        const next = new Uint8Array(bytes.length + chunk.length);
        next.set(bytes);
        next.set(chunk, bytes.length);
        fs.files.set(uri, next);
      },
      close() { fs.openHandles.delete(handle); },
    };
    fs.openHandles.add(handle);
    return handle;
  }
}
export const Paths = { document: new Directory("file:///documents"), cache: new Directory("file:///cache") };
`;

const fakeDatabase = `
export async function runDb(fn) { return fn(globalThis.__archiveTestDb); }
`;

const hooks = `
import { existsSync } from "node:fs";
const root = ${JSON.stringify(new URL("../src/", import.meta.url).href)};
const fakes = {
  "expo-file-system": ${JSON.stringify(fakeFileSystem)},
  "expo-file-system/legacy": "export {};",
  "expo-sqlite": "export const defaultDatabaseDirectory = null;",
  "@/services/db/database": ${JSON.stringify(fakeDatabase)},
  "@/modules/entry/store/EntryStore": "export function notifyStoreReload() {}",
  "@/services/drafts/store": "export async function discardAllDrafts() {}",
  "@/shared/utils/appInfo": "export const APP_VERSION = '1.0.0';",
  "@/shared/utils/devLog": "export function reportError() {} export function logDevWarning() {}",
};
function moduleUrl(base) {
  if (existsSync(new URL(base + ".ts"))) return base + ".ts";
  return base + "/index.ts";
}
export async function resolve(specifier, context, next) {
  if (specifier in fakes) return { url: "fake:" + specifier, shortCircuit: true };
  if (specifier.startsWith("@/")) return { url: moduleUrl(root + specifier.slice(2)), shortCircuit: true };
  if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(root)) {
    return { url: moduleUrl(new URL(specifier, context.parentURL).href), shortCircuit: true };
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.startsWith("fake:")) {
    return { format: "module", source: fakes[url.slice(5)], shortCircuit: true };
  }
  return next(url, context);
}
`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`);

const sql = new DatabaseSync(":memory:");
globalThis.__archiveTestDb = {
  execAsync: async (source) => sql.exec(source),
  runAsync: async (source, ...params) => sql.prepare(source).run(...params),
  getFirstAsync: async (source, ...params) => sql.prepare(source).get(...params) ?? null,
  getAllAsync: async (source, ...params) => sql.prepare(source).all(...params),
  withTransactionAsync: async (task) => {
    sql.exec("BEGIN");
    try {
      await task();
      sql.exec("COMMIT");
    } catch (error) {
      sql.exec("ROLLBACK");
      throw error;
    }
  },
};
const { initializeDatabaseSchema } = await import("../src/services/db/schema.ts");
await initializeDatabaseSchema(globalThis.__archiveTestDb);

const { exportBackupArchive, MissingBackupMediaError } = await import(
  "../src/services/backup/export/index.ts"
);
const { importBackupArchive } = await import("../src/services/backup/import/index.ts");
const { inspectBackupArchive } = await import("../src/services/backup/import/inspect.ts");
const fs = globalThis.__fakeFs;
const LARGE = 5 * 1024 * 1024;

function addMedia(name, size) {
  fs.dirs.add("file:///documents/media");
  fs.files.set(`file:///documents/media/${name}`, new Uint8Array(size).fill(7));
}

function addEntry(id, images) {
  sql
    .prepare("INSERT INTO entries (id, created_at, updated_at, images) VALUES (?, 1, 1, ?)")
    .run(id, JSON.stringify(images));
}

function cachedBackups() {
  return [...fs.files.keys()].filter((uri) => uri.startsWith("file:///cache/openlog-backup-"));
}

/** Starts `run` with a signal that a zero-delay timer aborts; the timer only fires if `run` yields. */
async function runWithTimerCancel(run) {
  const controller = new AbortController();
  let timerFired = false;
  let settledBeforeTimer = false;
  setTimeout(() => {
    timerFired = true;
    controller.abort();
  }, 0);
  const result = run(controller.signal);
  result.then(
    () => {
      settledBeforeTimer ||= !timerFired;
    },
    () => {
      settledBeforeTimer ||= !timerFired;
    }
  );
  return { result, wasSettledBeforeTimer: () => settledBeforeTimer };
}

test.beforeEach(() => {
  fs.files.clear();
  fs.dirs.clear();
  fs.openHandles.clear();
  fs.onRead = null;
  sql.exec("DELETE FROM entries; DELETE FROM tags; DELETE FROM settings;");
});

test("export fails with the missing-media error when a referenced file is absent", async () => {
  addMedia("kept.jpg", 10);
  addEntry("entry-1", ["kept.jpg", "gone.jpg"]);

  await assert.rejects(exportBackupArchive(), (error) => {
    assert.ok(error instanceof MissingBackupMediaError);
    assert.match(error.message, /^1 file attached to your entries is missing/);
    return true;
  });
  assert.deepEqual(cachedBackups(), []);
});

test("export fails with the missing-media error when a file is deleted mid-export", async () => {
  addMedia("a.jpg", LARGE);
  addMedia("b.jpg", 10);
  addEntry("entry-1", ["a.jpg", "b.jpg"]);
  fs.onRead = (name) => {
    if (name === "a.jpg") fs.files.delete("file:///documents/media/b.jpg");
  };

  await assert.rejects(exportBackupArchive(), MissingBackupMediaError);
  assert.deepEqual(cachedBackups(), []);
  assert.equal(fs.openHandles.size, 0);
});

test("export yields while reading media, so a cancel lands before it finishes", async () => {
  addMedia("large.jpg", LARGE);
  addEntry("entry-1", ["large.jpg"]);

  const run = await runWithTimerCancel((signal) => exportBackupArchive({ signal }));
  await assert.rejects(run.result, /Backup cancelled/);
  assert.equal(run.wasSettledBeforeTimer(), false);
  assert.deepEqual(cachedBackups(), []);
});

async function exportLargeBackup() {
  addMedia("large.jpg", LARGE);
  addEntry("entry-1", ["large.jpg"]);
  const { fileUri } = await exportBackupArchive();
  assert.ok(fs.files.get(fileUri).length > LARGE);
  return fileUri;
}

test("inspect yields while reading the archive, so a cancel lands before it finishes", async () => {
  const fileUri = await exportLargeBackup();

  const run = await runWithTimerCancel((signal) => inspectBackupArchive(fileUri, { signal }));
  await assert.rejects(run.result, /Inspection cancelled/);
  assert.equal(run.wasSettledBeforeTimer(), false);
});

test("import yields while reading, and a cancel there leaves no media handle open", async () => {
  const fileUri = await exportLargeBackup();
  sql.exec("DELETE FROM entries;");
  fs.files.delete("file:///documents/media/large.jpg");

  const run = await runWithTimerCancel((signal) => importBackupArchive(fileUri, { signal }));
  await assert.rejects(run.result, /Import cancelled/);
  assert.equal(run.wasSettledBeforeTimer(), false);
  assert.equal(fs.openHandles.size, 0, "a staged media file was left open");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM entries").get().count, 0);
  assert.equal(fs.files.has("file:///documents/media/large.jpg"), false);
});

test("an uncancelled export restores through import with its media", async () => {
  const fileUri = await exportLargeBackup();
  sql.exec("DELETE FROM entries;");
  fs.files.delete("file:///documents/media/large.jpg");

  const progress = [];
  const { importedCount } = await importBackupArchive(fileUri, {
    onProgress: (processed, total) => progress.push([processed, total]),
  });
  assert.equal(importedCount, 1);
  assert.equal(fs.files.get("file:///documents/media/large.jpg").length, LARGE);
  assert.deepEqual(progress.at(-1), [fs.files.get(fileUri).length, fs.files.get(fileUri).length]);
  assert.equal(fs.openHandles.size, 0);
});
