import assert from "node:assert/strict";
import test from "node:test";

import { assertArchiveManifest } from "../src/services/backup/shared.ts";

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
