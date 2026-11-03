import assert from "node:assert/strict";
import test from "node:test";
import {
  draftSignature,
  isDraftFileRef,
  isDraftKey,
  parseDraftSnapshot,
  serializeDraftSnapshot,
} from "../src/services/drafts/snapshot.ts";

const stored = {
  text: "Half-written thought",
  images: ["drafts/new/0b1c.jpg", "media/kept-photo.jpg"],
  audios: ["drafts/new/voice.m4a"],
  attachments: [{ uri: "drafts/new/1f2e.pdf", name: "Invoice.pdf", mime: "application/pdf" }],
  tags: [{ id: "tag-1", name: "Trips", colorId: "sage" }],
  createdAt: 1_700_000_000_000,
  location: { latitude: 30.27, longitude: -97.74, name: "Austin, Texas, United States" },
};

test("a stored draft round-trips through serialization", () => {
  assert.deepEqual(parseDraftSnapshot(serializeDraftSnapshot(stored)), {
    ...stored,
    attachments: [{ ...stored.attachments[0], size: undefined }],
  });
});

test("corrupt, foreign, or unversioned files read as no draft", () => {
  assert.equal(parseDraftSnapshot("{ not json"), null);
  assert.equal(parseDraftSnapshot("[]"), null);
  assert.equal(parseDraftSnapshot(JSON.stringify({ ...stored })), null);
  assert.equal(parseDraftSnapshot(JSON.stringify({ ...stored, version: 99 })), null);
  assert.equal(
    parseDraftSnapshot(serializeDraftSnapshot({ ...stored, createdAt: Number.NaN })),
    null
  );
});

test("file refs outside the media and drafts directories are dropped", () => {
  const parsed = parseDraftSnapshot(
    serializeDraftSnapshot({
      ...stored,
      images: [
        "drafts/new/ok.jpg",
        "../secrets.db",
        "media/../../SQLite/openlog.db",
        "file:///var/mobile/Library/Caches/picked.jpg",
        "drafts/../x.jpg",
        42,
      ],
      attachments: [{ uri: "/etc/passwd", name: "passwd" }, ...stored.attachments],
    })
  );
  assert.deepEqual(parsed?.images, ["drafts/new/ok.jpg"]);
  assert.deepEqual(
    parsed?.attachments.map((attachment) => attachment.uri),
    ["drafts/new/1f2e.pdf"]
  );
});

test("malformed fields are dropped individually, keeping the rest of the draft", () => {
  const parsed = parseDraftSnapshot(
    JSON.stringify({
      version: 1,
      text: 7,
      images: "media/a.jpg",
      tags: [{ id: "tag-1" }, stored.tags[0]],
      createdAt: stored.createdAt,
      location: { latitude: "30", longitude: -97 },
    })
  );
  assert.deepEqual(parsed, {
    text: "",
    images: [],
    audios: [],
    attachments: [],
    tags: stored.tags,
    createdAt: stored.createdAt,
    location: null,
  });
});

test("restored lists are bounded", () => {
  const images = Array.from({ length: 500 }, (_, index) => `drafts/new/${index}.jpg`);
  const parsed = parseDraftSnapshot(serializeDraftSnapshot({ ...stored, images }));
  assert.equal(parsed?.images.length, 50);
});

test("draft keys cannot name a path", () => {
  assert.ok(isDraftKey("new"));
  assert.ok(isDraftKey("3f1d9c2a-7b4e-4c1f-9a0e-1d2c3b4a5f60"));
  for (const key of ["", "..", "a/b", "new.json", "x".repeat(65)]) {
    assert.equal(isDraftKey(key), false, key);
  }
  assert.equal(isDraftFileRef("drafts/a/b/c.jpg"), false);
  assert.equal(isDraftFileRef("media/.hidden"), false);
});

test("signatures ignore tag display fields but notice content changes", () => {
  const renamed = { ...stored, tags: [{ ...stored.tags[0], name: "Travel", colorId: "teal" }] };
  assert.equal(draftSignature(renamed), draftSignature(stored));
  assert.notEqual(draftSignature({ ...stored, text: `${stored.text}.` }), draftSignature(stored));
  assert.notEqual(
    draftSignature({ ...stored, images: stored.images.slice(1) }),
    draftSignature(stored)
  );
  assert.notEqual(draftSignature({ ...stored, location: null }), draftSignature(stored));
});
