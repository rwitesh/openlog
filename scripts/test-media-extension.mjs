import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// fromDraft runs against the real attachments.ts; only native modules and the
// file copy are replaced, and the copy records the extension it was given.
const SRC = new URL("../src/", import.meta.url);
const STUBS = {
  "@/services/media": `
    export { fileExtension, persistAttachment } from "${new URL("services/media/attachments.ts", SRC)}";
    export { persistMedia } from "stub:storage";`,
  "./storage": `export { persistMedia } from "stub:storage";`,
  "stub:storage": `
    export async function persistMedia(uri, ext) {
      globalThis.persisted.push({ uri, ext });
      return "stored." + ext;
    }`,
  "@/shared/utils/devLog": "export function logDevWarning() {}",
  "react-native": "export const Alert = {};",
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

test("a photo URI without a usable extension falls back to JPEG", async () => {
  const extensions = await persistedImageExtensions([
    "file:///data/user/0/share.openlog.mobile/cache/ImagePicker/e5",
    "content://media.provider/images/42",
  ]);
  assert.deepEqual(extensions, ["jpeg", "jpeg"]);
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
