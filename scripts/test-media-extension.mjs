import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// fromDraft and shareImage run against the real media modules; only native modules
// and the file copy are replaced, and the stubs record what they were given.
const SRC = new URL("../src/", import.meta.url);
const STUBS = {
  "@/services/media": `
    export { fileExtension, persistAttachment } from "${new URL("services/media/attachments.ts", SRC)}";
    export { persistMedia, releaseMediaCopies } from "stub:storage";`,
  "./storage": `export { persistMedia } from "stub:storage";`,
  "stub:storage": `
    export function releaseMediaCopies() {}
    export async function persistMedia(uri, ext) {
      globalThis.persisted.push({ uri, ext });
      return "stored." + ext;
    }`,
  "@/shared/utils/devLog": "export function logDevWarning() {} export function reportError() {}",
  "react-native": "export const Alert = { alert() {} };",
  "expo-sharing": `
    export async function isAvailableAsync() { return true; }
    export async function shareAsync(uri, options) { globalThis.shared.push(options.mimeType); }`,
  "react-native-file-viewer-turbo": "export function open() {}",
  "expo-document-picker": "export {};",
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in STUBS) return { url: `stub:${specifier}`, shortCircuit: true };
    if (specifier.startsWith("@/")) {
      return { url: new URL(`${specifier.slice(2)}.ts`, SRC).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("stub:")) {
      return { format: "module", source: STUBS[url.slice(5)], shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const { fromDraft } = await import("../src/modules/compose/utils/DraftTransform.ts");
const { shareImage } = await import("../src/services/media/share.ts");

async function persistedImageExtensions(images) {
  globalThis.persisted = [];
  await fromDraft({ images, createdAt: 1 });
  return globalThis.persisted.map(({ ext }) => ext);
}

test("photos kept at their original size keep their real extension", async () => {
  const extensions = await persistedImageExtensions([
    "file:///data/user/0/share.openlog.mobile/cache/ImagePicker/a1.png",
    "file:///var/mobile/Containers/Data/Application/X/tmp/ImagePicker/b2.HEIC",
    "file:///data/user/0/share.openlog.mobile/cache/ImagePicker/c3.webp",
  ]);
  assert.deepEqual(extensions, ["png", "heic", "webp"]);
});

test("downscaled photos re-encoded as JPEG stay .jpg", async () => {
  const extensions = await persistedImageExtensions([
    "file:///data/user/0/share.openlog.mobile/cache/ImageManipulator/d4.jpg",
  ]);
  assert.deepEqual(extensions, ["jpg"]);
});

test("a photo URI without a usable extension falls back to .jpg", async () => {
  const extensions = await persistedImageExtensions([
    "file:///data/user/0/share.openlog.mobile/cache/ImagePicker/e5",
    "content://media.provider/images/42",
    // A restored draft names its copy of an extension-less photo `.bin`.
    "file:///data/user/0/share.openlog.mobile/files/drafts/new/f6.bin",
  ]);
  assert.deepEqual(extensions, ["jpg", "jpg", "jpg"]);
});

test("query strings and fragments don't hide a photo's extension", async () => {
  const extensions = await persistedImageExtensions(["file:///x/a.png?v=1", "file:///x/b.webp#f"]);
  assert.deepEqual(extensions, ["png", "webp"]);
});

test("audio and attachments keep their existing extensions", async () => {
  globalThis.persisted = [];
  await fromDraft({
    audios: ["file:///cache/recording.m4a"],
    attachments: [{ uri: "file:///cache/x", name: "notes.PDF" }],
    createdAt: 1,
  });
  assert.deepEqual(
    globalThis.persisted.map(({ ext }) => ext),
    ["m4a", "pdf"]
  );
});

test("a photo kept in its original format is shared with its own MIME type", async () => {
  globalThis.shared = [];
  for (const name of [
    "a.gif",
    "b.AVIF",
    "c.bmp",
    "d.png",
    "e.webp",
    "f.heic",
    "g.heif",
    "h.tiff",
    "i.jpg",
    "j.jpeg",
  ]) {
    await shareImage(`file:///media/${name}`);
  }
  assert.deepEqual(globalThis.shared, [
    "image/gif",
    "image/avif",
    "image/bmp",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/tiff",
    "image/jpeg",
    "image/jpeg",
  ]);
});
