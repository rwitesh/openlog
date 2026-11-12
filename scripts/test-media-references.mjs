import assert from "node:assert/strict";
import { register } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

// entries.ts runs its queries through runDb; here runDb hands them to node:sqlite.
const hooks = `
const root = ${JSON.stringify(new URL("../src/", import.meta.url).href)};
const fakes = {
  "./database": "export async function runDb(fn) { return fn(globalThis.__mediaReferenceDb); }",
  "./tags": "export const MAX_TAGS_PER_ENTRY = 10;",
  "@/services/media/storage": "export function mediaFileUri(filename) { return filename; }",
};
export async function resolve(specifier, context, next) {
  if (specifier in fakes) return { url: "fake:" + specifier, shortCircuit: true };
  if (specifier.startsWith("@/")) return { url: root + specifier.slice(2) + ".ts", shortCircuit: true };
  if (specifier.startsWith("./") && !specifier.endsWith(".ts")) return next(specifier + ".ts", context);
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
sql.exec("CREATE TABLE entries (id TEXT, images TEXT, audios TEXT, attachments TEXT)");
globalThis.__mediaReferenceDb = {
  getAllAsync: async (query, ...params) => sql.prepare(query).all(...params),
  getFirstAsync: async (query, ...params) => sql.prepare(query).get(...params) ?? null,
};
const { filterUnreferencedMedia } = await import("../src/services/db/entries.ts");
const insert = sql.prepare("INSERT INTO entries VALUES (?, ?, ?, ?)");

test.beforeEach(() => {
  sql.exec("DELETE FROM entries");
});

test("only files no entry stores are reported unreferenced", async () => {
  insert.run(
    "e1",
    JSON.stringify(["photo.jpg", 'quote"d.jpg']),
    JSON.stringify(["voice.m4a"]),
    JSON.stringify([{ uri: "doc.pdf", name: "Report.pdf", mime: "application/pdf" }])
  );
  insert.run("e2", null, null, null);

  const unreferenced = await filterUnreferencedMedia([
    "photo.jpg",
    'quote"d.jpg',
    "voice.m4a",
    "doc.pdf",
    "file:///documents/media/photo.jpg",
    "gone.jpg",
    "gone.jpg",
  ]);
  assert.deepEqual(unreferenced, ["gone.jpg"]);
});

test("a malformed or legacy row still protects the files it names", async () => {
  insert.run(
    "e1",
    '["broken.jpg", ',
    JSON.stringify(["file:///old/container/media/legacy.jpg"]),
    null
  );
  assert.deepEqual(await filterUnreferencedMedia(["broken.jpg", "legacy.jpg", "orphan.jpg"]), [
    "orphan.jpg",
  ]);
});

test("names a case-insensitive filesystem treats as one file count as referenced", async () => {
  insert.run("e1", JSON.stringify(["Photo.JPG", "e\u0301.jpg"]), null, null);
  assert.deepEqual(await filterUnreferencedMedia(["photo.jpg", "\u00e9.jpg", "other.jpg"]), [
    "other.jpg",
  ]);
});

test("a large timeline is checked in linear time", async () => {
  sql.exec("BEGIN");
  const stored = [];
  for (let i = 0; i < 20000; i++) {
    const images = [`${i}-a.jpg`, `${i}-b.jpg`];
    stored.push(...images);
    insert.run(`e${i}`, JSON.stringify(images), null, null);
  }
  sql.exec("COMMIT");
  const started = performance.now();
  const unreferenced = await filterUnreferencedMedia([...stored, "orphan.jpg"]);
  assert.deepEqual(unreferenced, ["orphan.jpg"]);
  assert.ok(performance.now() - started < 1500, "checking 40,000 files took too long");
});
