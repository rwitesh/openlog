import assert from "node:assert/strict";
import { register } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

// expo-file-system is replaced with an in-memory stand-in so the gate and deletion protocol,
// and the EntryStore mutations that use it, run in Node.
const fakeFileSystem = `
const fs = (globalThis.__fakeFs ??= { files: new Set(), dirs: new Set(), beforeCopyEnds: null });
function join(parts) {
  return parts
    .map((part) => (typeof part === "string" ? part : part.uri))
    .reduce((base, part) => (base ? base.replace(/\\/$/, "") + "/" + part.replace(/^\\//, "") : part), "");
}
export class Directory {
  constructor(...parts) { this.uri = join(parts); }
  get exists() { return fs.dirs.has(this.uri); }
  create() { fs.dirs.add(this.uri); }
  list() {
    const prefix = this.uri + "/";
    return [...fs.files]
      .filter((uri) => uri.startsWith(prefix) && !uri.slice(prefix.length).includes("/"))
      .map((uri) => new File(uri));
  }
}
export class File {
  constructor(...parts) { this.uri = join(parts); }
  get name() { return this.uri.slice(this.uri.lastIndexOf("/") + 1); }
  get exists() { return fs.files.has(this.uri); }
  delete() { fs.files.delete(this.uri); }
  async copy(destination) {
    if (!fs.files.has(this.uri)) throw new Error("source missing");
    fs.files.add(destination.uri);
    const hook = fs.beforeCopyEnds;
    fs.beforeCopyEnds = null;
    if (hook) await hook(destination);
  }
}
export const Paths = { document: new Directory("file:///documents") };
`;

// EntryStore and db/entries run for real on node:sqlite behind a runDb that serializes like the app's.
const fakeDatabase = `
let chain = Promise.resolve();
export function runDb(fn) {
  const next = chain.then(() => fn(globalThis.__mediaTestDb), () => fn(globalThis.__mediaTestDb));
  chain = next.then(() => undefined, () => undefined);
  return next;
}
`;

const hooks = `
import { existsSync } from "node:fs";
const root = ${JSON.stringify(new URL("../src/", import.meta.url).href)};
const fakes = {
  "expo-file-system": ${JSON.stringify(fakeFileSystem)},
  "react": "export const useCallback = () => {}, useEffect = () => {}, useRef = () => ({}), useState = () => [];",
  "./database": ${JSON.stringify(fakeDatabase)},
  "@/services/drafts/store": "export async function discardDraft() {} export async function discardAllDrafts() {}",
  "@/shared/utils/devLog": "export function reportError(scope, error) { (globalThis.__reportedErrors ??= []).push(error); }",
};
function moduleUrl(base) {
  if (existsSync(new URL(base + ".ts"))) return base + ".ts";
  return base + "/index.ts";
}
export async function resolve(specifier, context, next) {
  if (specifier in fakes) return { url: "fake:" + specifier, shortCircuit: true };
  if (specifier === "@/services/media") return { url: root + "services/media/storage.ts", shortCircuit: true };
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
// expo-sqlite takes bind values either spread or as one array.
const bind = (params) => (params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
globalThis.__mediaTestDb = {
  execAsync: async (source) => sql.exec(source),
  runAsync: async (source, ...params) => sql.prepare(source).run(...bind(params)),
  getFirstAsync: async (source, ...params) => sql.prepare(source).get(...bind(params)) ?? null,
  getAllAsync: async (source, ...params) => sql.prepare(source).all(...bind(params)),
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
await initializeDatabaseSchema(globalThis.__mediaTestDb);

const gates = await import("../src/services/backup/utils/index.ts");
const storage = await import("../src/services/media/storage.ts");
const entries = await import("../src/services/db/entries.ts");
const store = await import("../src/modules/entry/store/EntryStore.ts");
const fs = globalThis.__fakeFs;
const mediaUri = (name) => `file:///documents/media/${name}`;

function addMediaFile(name) {
  fs.dirs.add("file:///documents/media");
  fs.files.add(mediaUri(name));
}

/** Reports whether a promise settled after pending work had a chance to run. */
async function isSettled(promise) {
  let settled = false;
  promise.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    }
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  return settled;
}

test.beforeEach(() => {
  // A failed test must not leave a gate held for the tests after it.
  gates.releaseImportGate();
  for (let i = 0; i < 100; i++) gates.releaseExportGate();
  fs.files.clear();
  fs.dirs.clear();
  fs.beforeCopyEnds = null;
  sql.exec("DELETE FROM entries; DELETE FROM tags;");
  globalThis.__reportedErrors = [];
});

test("an import keeps waiting until every overlapping export releases the gate", async () => {
  gates.acquireExportGate();
  const importWait = gates.waitForExportGate();
  gates.acquireExportGate();

  gates.releaseExportGate();
  assert.equal(await isSettled(importWait), false, "released by the second export's acquire");
  assert.throws(() => gates.acquireImportGate(), /export is in progress/);

  gates.releaseExportGate();
  assert.equal(await isSettled(importWait), true);
  gates.acquireImportGate();
  gates.releaseImportGate();
});

test("an export cannot acquire the gate while an import holds it", () => {
  gates.acquireImportGate();
  try {
    assert.throws(() => gates.acquireExportGate(), /import is in progress/);
  } finally {
    gates.releaseImportGate();
  }
  gates.acquireExportGate();
  gates.releaseExportGate();
});

test("deleting media removes the selected files once no backup holds a gate", async () => {
  addMediaFile("old.jpg");
  addMediaFile("kept.jpg");

  gates.acquireExportGate();
  const deletion = storage.deleteMediaFiles(async () => ["old.jpg", "missing.jpg"]);
  assert.equal(await isSettled(deletion), false, "deleted a file an export may be reading");
  assert.equal(fs.files.has(mediaUri("old.jpg")), true);

  gates.releaseExportGate();
  await deletion;
  assert.equal(fs.files.has(mediaUri("old.jpg")), false);
  assert.equal(fs.files.has(mediaUri("kept.jpg")), true);
});

test("a restore that runs while references are checked keeps the media it brought back", async () => {
  addMediaFile("shared.jpg");
  const referenced = new Set();
  let checks = 0;

  await storage.deleteMediaFiles(async () => {
    checks += 1;
    const unreferenced = referenced.has("shared.jpg") ? [] : ["shared.jpg"];
    if (checks === 1) {
      // The restore's timeline refers to the file this check found unreferenced.
      gates.acquireImportGate();
      referenced.add("shared.jpg");
      gates.releaseImportGate();
    }
    return unreferenced;
  });

  assert.equal(checks, 2);
  assert.equal(fs.files.has(mediaUri("shared.jpg")), true);
});

test("a copy pruned by a restore that began mid-copy is copied again", async () => {
  fs.files.add("file:///cache/picked.jpg");
  fs.beforeCopyEnds = async (destination) => {
    gates.acquireImportGate();
    // The restore prunes every live file its timeline does not reference.
    fs.files.delete(destination.uri);
    gates.releaseImportGate();
  };

  const filename = await storage.persistMedia("file:///cache/picked.jpg", "jpg");
  assert.equal(fs.files.has(mediaUri(filename)), true);
});

test("the sweep deletes unreferenced files but keeps referenced ones and uncommitted copies", async () => {
  fs.files.add("file:///cache/new.m4a");
  const copied = await storage.persistMedia("file:///cache/new.m4a", "m4a");
  addMediaFile("orphan.jpg");
  addMediaFile("used.jpg");
  let offered = [];

  await storage.deleteUnreferencedMedia(async (filenames) => {
    offered = filenames;
    return filenames.filter((filename) => filename !== "used.jpg");
  });

  assert.deepEqual(offered.sort(), ["orphan.jpg", "used.jpg"]);
  assert.equal(fs.files.has(mediaUri("orphan.jpg")), false);
  assert.equal(fs.files.has(mediaUri("used.jpg")), true);
  assert.equal(fs.files.has(mediaUri(copied)), true);
});

test("the sweep waits for a running restore before listing media", async () => {
  addMediaFile("orphan.jpg");
  gates.acquireImportGate();
  const sweep = storage.deleteUnreferencedMedia(async (filenames) => filenames);
  assert.equal(await isSettled(sweep), false);
  assert.equal(fs.files.has(mediaUri("orphan.jpg")), true);
  gates.releaseImportGate();
  await sweep;
  assert.equal(fs.files.has(mediaUri("orphan.jpg")), false);
});

test("a failed reference check deletes nothing", async () => {
  addMediaFile("orphan.jpg");
  await assert.rejects(
    storage.deleteUnreferencedMedia(async () => {
      throw new Error("database unavailable");
    })
  );
  assert.equal(fs.files.has(mediaUri("orphan.jpg")), true);
});

test("a save is refused when a restore pruned media it copied before the entry committed", async () => {
  fs.files.add("file:///cache/late.jpg");
  const copied = await storage.persistMedia("file:///cache/late.jpg", "jpg");
  addMediaFile("older.jpg");
  await storage.assertCopiedMediaPresent([copied, "older.jpg"]);

  gates.acquireImportGate();
  const check = storage.assertCopiedMediaPresent([copied]);
  assert.equal(await isSettled(check), false, "checked while a restore was running");
  fs.files.delete(mediaUri(copied));
  gates.releaseImportGate();
  await assert.rejects(check, /restore removed media/);

  // Files this session did not copy are the entry's existing media; their absence is not a race.
  fs.files.delete(mediaUri("older.jpg"));
  await storage.assertCopiedMediaPresent(["older.jpg"]);
});

test("an export that starts while references are checked makes the check run again", async () => {
  addMediaFile("read.jpg");
  let checks = 0;

  const deletion = storage.deleteMediaFiles(async () => {
    checks += 1;
    if (checks === 1) gates.acquireExportGate();
    return ["read.jpg"];
  });
  assert.equal(await isSettled(deletion), false, "deleted a file the export may be reading");
  assert.equal(fs.files.has(mediaUri("read.jpg")), true);

  gates.releaseExportGate();
  await deletion;
  assert.equal(checks, 2);
  assert.equal(fs.files.has(mediaUri("read.jpg")), false);
});

async function persistFresh(name) {
  fs.files.add(`file:///cache/${name}`);
  return storage.persistMedia(`file:///cache/${name}`, "jpg");
}

test("deleting an entry during a restore keeps media the restored timeline references", async () => {
  addMediaFile("a.jpg");
  const { id } = await store.addEntry({ images: ["a.jpg"] });

  gates.acquireImportGate();
  const removal = store.removeEntry(id);
  assert.equal(await isSettled(removal), false);
  await entries.createEntry({ images: ["a.jpg"] });
  gates.releaseImportGate();
  await removal;

  assert.equal(fs.files.has(mediaUri("a.jpg")), true);
});

test("deleting an entry removes media no other entry references", async () => {
  addMediaFile("only.jpg");
  addMediaFile("shared.jpg");
  const { id } = await store.addEntry({ images: ["only.jpg", "shared.jpg"] });
  await store.addEntry({ images: ["shared.jpg"] });

  await store.removeEntry(id);
  assert.equal(fs.files.has(mediaUri("only.jpg")), false);
  assert.equal(fs.files.has(mediaUri("shared.jpg")), true);
});

for (const save of ["addEntry", "patchEntry"]) {
  test(`${save} refuses to commit media a restore pruned after it was copied`, async () => {
    const { id } = await store.addEntry({ text: "existing" });
    const copied = await persistFresh(`${save}.jpg`);

    gates.acquireImportGate();
    const saving =
      save === "addEntry"
        ? store.addEntry({ images: [copied] })
        : store.patchEntry(id, { images: [copied] });
    assert.equal(await isSettled(saving), false, "wrote the entry while a restore was running");
    fs.files.delete(mediaUri(copied));
    gates.releaseImportGate();

    await assert.rejects(saving, /restore removed media/);
    const dangling = sql.prepare("SELECT id FROM entries WHERE instr(images, ?) > 0").all(copied);
    assert.deepEqual(dangling, []);
  });
}

test("delete all removes every unreferenced file, including ones saved this session", async () => {
  const saved = await persistFresh("saved.jpg");
  await store.addEntry({ images: [saved] });
  addMediaFile("orphan.jpg");

  await store.clearAll();
  assert.deepEqual(
    [...fs.files].filter((uri) => uri.startsWith(mediaUri(""))),
    []
  );
});

test("delete all keeps the copy of a save still in flight", async () => {
  const inFlight = await persistFresh("in-flight.jpg");

  await store.clearAll();
  assert.equal(fs.files.has(mediaUri(inFlight)), true);
  const entry = await store.addEntry({ images: [inFlight] });
  assert.deepEqual(entry.images.length, 1);
  assert.equal(fs.files.has(mediaUri(inFlight)), true);
});

test("delete all during a restore keeps the restored media", async () => {
  addMediaFile("old.jpg");
  await store.addEntry({ images: ["old.jpg"] });

  gates.acquireImportGate();
  const clearing = store.clearAll();
  assert.equal(await isSettled(clearing), false);
  addMediaFile("restored.jpg");
  await entries.createEntry({ images: ["restored.jpg"] });
  gates.releaseImportGate();
  await clearing;

  assert.equal(fs.files.has(mediaUri("restored.jpg")), true);
  assert.equal(fs.files.has(mediaUri("old.jpg")), false);
});

test("the launch sweep deletes orphans only when the timeline has entries", async () => {
  addMediaFile("orphan.jpg");
  await store.sweepUnreferencedMedia();
  assert.equal(fs.files.has(mediaUri("orphan.jpg")), true, "swept media of an empty timeline");

  addMediaFile("kept.jpg");
  await store.addEntry({ images: ["kept.jpg"] });
  await store.sweepUnreferencedMedia();
  assert.equal(fs.files.has(mediaUri("orphan.jpg")), false);
  assert.equal(fs.files.has(mediaUri("kept.jpg")), true);
});

test("a copy that fails because a restore interfered is retried", async () => {
  fs.files.add("file:///cache/retry.jpg");
  fs.beforeCopyEnds = async () => {
    gates.acquireImportGate();
    gates.releaseImportGate();
    throw new Error("copy interrupted");
  };

  const filename = await storage.persistMedia("file:///cache/retry.jpg", "jpg");
  assert.equal(fs.files.has(mediaUri(filename)), true);
});

test("a copy that fails on its own is reported without a partial file", async () => {
  fs.files.add("file:///cache/broken.jpg");
  fs.beforeCopyEnds = async () => {
    throw new Error("disk full");
  };

  await assert.rejects(storage.persistMedia("file:///cache/broken.jpg", "jpg"), /disk full/);
  assert.deepEqual(
    [...fs.files].filter((uri) => uri.startsWith(mediaUri(""))),
    []
  );
});
