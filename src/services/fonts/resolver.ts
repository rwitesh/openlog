import type { FontName, FontSource } from "./types";

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
  const slug = fontNameToSlug(fontName);
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/latin-400-normal.ttf`;
  return {
    family: fontName,
    url,
  };
}
