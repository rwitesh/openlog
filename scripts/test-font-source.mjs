import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FONT, getFonts } from "../src/services/fonts/catalog.ts";
import { resolveFontSource } from "../src/services/fonts/resolver.ts";

const downloadable = getFonts().filter((font) => font !== DEFAULT_FONT);

test("every downloadable font resolves to an exact, pinned CDN version", () => {
  for (const font of downloadable) {
    const { url } = resolveFontSource(font);
    assert.match(
      url,
      /^https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/[a-z0-9-]+@\d+\.\d+\.\d+\/latin-400-normal\.ttf$/,
      font
    );
  }
});

test("a font outside the catalog has no download source", () => {
  assert.throws(() => resolveFontSource("Comic Sans MS"));
});
