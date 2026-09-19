import assert from "node:assert/strict";
import test from "node:test";
import { removedMedia } from "../src/modules/entry/store/mediaDiff.ts";

const entry = {
  id: "entry-1",
  createdAt: 1,
  updatedAt: 1,
  images: [
    "file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/media/keep-photo.jpg",
    "file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/media/drop-photo.jpg",
  ],
  audios: ["file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/media/voice.m4a"],
  attachments: [
    { uri: "media/keep.pdf", name: "keep.pdf" },
    { uri: "media/drop.pdf", name: "drop.pdf" },
  ],
};

test("a text-only edit never schedules media for deletion", () => {
  assert.deepEqual(removedMedia(entry, { text: "Fixed a typo" }), []);
});

test("media survives path format changes because diffing uses pure filenames", () => {
  // The read model resolves to live container URIs while drafts persist bare
  // filenames; both sides must compare equal for retained media.
  const kept = removedMedia(entry, {
    images: ["keep-photo.jpg", "drop-photo.jpg"],
    audios: ["voice.m4a"],
    attachments: [
      { uri: "keep.pdf", name: "keep.pdf" },
      { uri: "drop.pdf", name: "drop.pdf" },
    ],
  });
  assert.deepEqual(kept, []);
});

test("genuinely removed media is reported as bare filenames", () => {
  const removed = removedMedia(entry, {
    images: ["keep-photo.jpg"],
    audios: [],
    attachments: [{ uri: "keep.pdf", name: "keep.pdf" }],
  });
  assert.deepEqual(removed, ["drop-photo.jpg", "voice.m4a", "drop.pdf"]);
});

test("media fields the input leaves undefined keep their files", () => {
  assert.deepEqual(removedMedia(entry, {}), []);
});
