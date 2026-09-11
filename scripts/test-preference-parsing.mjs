import assert from "node:assert/strict";
import test from "node:test";
import { parsePersistedChoice } from "../src/theme/preferenceParsing.ts";

test("parsePersistedChoice accepts supported persisted values", () => {
  assert.equal(parsePersistedChoice("dark", ["system", "light", "dark"], "system"), "dark");
});

test("parsePersistedChoice falls back for missing or unsupported values", () => {
  const allowed = ["rail", "minimal", "clean"];
  assert.equal(parsePersistedChoice(undefined, allowed, "rail"), "rail");
  assert.equal(parsePersistedChoice("unknown", allowed, "rail"), "rail");
});
