import assert from "node:assert/strict";
import test from "node:test";

import { getRestoreRecoveryAction } from "../src/services/backup/restoreRecovery.ts";
import {
  assertArchiveManifest,
  assertArchiveTags,
  assertEntryCounts,
} from "../src/services/backup/shared.ts";

const manifest = {
  format: "openlog-archive",
  version: 1,
  createdAt: 1_700_000_000_000,
  appVersion: "1.3.0",
  counts: { entry: 1, images: 1, audio: 1, attachments: 1 },
  previewEntries: [],
};

const entry = {
  id: "entry-1",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  images: ["media/photo.jpg"],
  audios: ["media/memo.m4a"],
  attachments: [{ uri: "media/file.pdf", name: "file.pdf" }],
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
        { ...manifest, counts: { ...manifest.counts, entry: -1 } },
        "openlog-archive",
        1
      ),
    /non-negative integers/
  );
  assert.throws(
    () => assertArchiveManifest({ ...manifest, version: 0 }, "openlog-archive", 1),
    /unsupported archive version/
  );
});

test("backup entry data must match every manifest media count before import commits", () => {
  assert.doesNotThrow(() => assertEntryCounts(manifest.counts, [entry]));
  assert.throws(
    () => assertEntryCounts({ ...manifest.counts, audio: 2 }, [entry]),
    /lists 2 audio files but archive contains 1/
  );
  assert.throws(
    () => assertEntryCounts({ ...manifest.counts, entry: 2 }, [entry]),
    /lists 2 entries but archive contains 1/
  );
});

test("backup tag catalogues retain reusable tags and reject ambiguous identifiers", () => {
  const tags = [
    { id: "work", name: "Work", colorId: "clay" },
    { id: "unused", name: "Someday", colorId: "sage" },
  ];
  assert.doesNotThrow(() => assertArchiveTags(tags));
  assert.throws(
    () => assertArchiveTags([...tags, { id: "other", name: " work ", colorId: "teal" }]),
    /Invalid backup tag/
  );
  assert.throws(
    () => assertArchiveTags([...tags, { id: "unused", name: "Later", colorId: "teal" }]),
    /Invalid backup tag/
  );
});

test("interrupted restores roll media back unless the SQLite transaction committed", () => {
  assert.equal(getRestoreRecoveryAction("prepared", false), "discard-staged-media");
  assert.equal(getRestoreRecoveryAction("swapping-media", false), "rollback-media");
  assert.equal(getRestoreRecoveryAction("media-swapped", false), "rollback-media");
  assert.equal(getRestoreRecoveryAction("database-committed", false), "rollback-media");
  assert.equal(getRestoreRecoveryAction("media-swapped", true), "complete");
});
