import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// storage.ts imports expo-file-system and the app's error reporter; both are replaced with
// in-memory stand-ins so the gate and deletion protocol runs in Node.
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

const hooks = `
const root = ${JSON.stringify(new URL("../src/", import.meta.url).href)};
const fakes = {
  "expo-file-system": ${JSON.stringify(fakeFileSystem)},
  "@/shared/utils/devLog": "export function reportError(scope, error) { throw error; }",
};
export async function resolve(specifier, context, next) {
  if (specifier in fakes) return { url: "fake:" + specifier, shortCircuit: true };
  if (specifier === "@/services/backup/utils") {
    return { url: root + "services/backup/utils/index.ts", shortCircuit: true };
  }
  if (specifier.startsWith("@/")) return { url: root + specifier.slice(2) + ".ts", shortCircuit: true };
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

const gates = await import("../src/services/backup/utils/index.ts");
const storage = await import("../src/services/media/storage.ts");
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
  for (let i = 0; i < 4; i++) gates.releaseExportGate();
  fs.files.clear();
  fs.dirs.clear();
  fs.beforeCopyEnds = null;
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

test("the sweep deletes unreferenced files but keeps referenced ones and this session's copies", async () => {
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
