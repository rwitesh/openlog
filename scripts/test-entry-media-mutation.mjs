import assert from "node:assert/strict";
import test from "node:test";
import { commitMediaUpdate } from "../src/modules/entry/store/mediaMutation.ts";

const existing = {
  id: "entry-1",
  createdAt: 1,
  updatedAt: 1,
  images: ["image-kept", "image-removed"],
  audios: ["audio-removed"],
  attachments: [
    { uri: "attachment-kept", name: "kept.pdf" },
    { uri: "attachment-removed", name: "removed.pdf" },
  ],
};

test("media cleanup begins only after the entry update commits", async () => {
  const events = [];
  let finishUpdate;
  const updateDone = new Promise((resolve) => {
    finishUpdate = resolve;
  });

  const mutation = commitMediaUpdate({
    existing,
    input: {
      images: ["image-kept"],
      audios: [],
      attachments: [{ uri: "attachment-kept", name: "kept.pdf" }],
    },
    update: async () => {
      events.push("update-start");
      await updateDone;
      events.push("update-committed");
      return existing;
    },
    cleanup: async (uris) => {
      events.push(`cleanup:${uris.join(",")}`);
    },
  });

  await Promise.resolve();
  assert.deepEqual(events, ["update-start"]);
  finishUpdate();
  await mutation;
  await Promise.resolve();
  assert.deepEqual(events, [
    "update-start",
    "update-committed",
    "cleanup:image-removed,audio-removed,attachment-removed",
  ]);
});

test("a failed update leaves all media cleanup untouched", async () => {
  let cleanupCalled = false;

  await assert.rejects(
    commitMediaUpdate({
      existing,
      input: { images: ["image-kept"] },
      update: async () => {
        throw new Error("SQLite write failed");
      },
      cleanup: async () => {
        cleanupCalled = true;
      },
    }),
    /SQLite write failed/
  );

  assert.equal(cleanupCalled, false);
});
