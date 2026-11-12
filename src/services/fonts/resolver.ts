import type { FontName, FontSource } from "./types";

/**
 * Exact Fontsource package versions, so every new download of a font gets the same files.
 * Cached fonts are keyed by slug only, so raising a version does not refresh existing caches.
 */
const FONTSOURCE_VERSIONS: ReadonlyMap<FontName, string> = new Map([
  ["Inter", "5.3.0"],
  ["Plus Jakarta Sans", "5.3.0"],
  ["Work Sans", "5.3.0"],
  ["Source Serif 4", "5.3.1"],
  ["Merriweather", "5.3.0"],
  ["EB Garamond", "5.3.0"],
  ["Fraunces", "5.3.0"],
  ["JetBrains Mono", "5.3.0"],
  ["IBM Plex Mono", "5.3.0"],
]);

/**
 * Converts a canonical font family name into a package slug for CDN lookup.
 * E.g. "Source Sans 3" -> "source-sans-3", "Plus Jakarta Sans" -> "plus-jakarta-sans".
 */
export function fontNameToSlug(fontName: string): string {
  return fontName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Resolves a font family name to its remote downloadable TTF source.
 */
export function resolveFontSource(fontName: FontName): FontSource {
  const version = FONTSOURCE_VERSIONS.get(fontName);
  if (!version) throw new Error(`No pinned font source for "${fontName}"`);
  const slug = fontNameToSlug(fontName);
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@${version}/latin-400-normal.ttf`;
  return {
    family: fontName,
    url,
  };
}
