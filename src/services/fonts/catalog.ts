import type { FontName } from "./types";

export const DEFAULT_FONT: FontName = "Source Sans 3";

/**
 * Downloadable fonts in display order, each with its exact Fontsource package version so
 * every new download gets the same files. Cached fonts are keyed by slug only, so raising
 * a version does not refresh existing caches. The default font is bundled with the app.
 */
export const FONTSOURCE_VERSIONS: ReadonlyMap<FontName, string> = new Map([
  // Modern Sans
  ["Inter", "5.3.0"],
  ["Plus Jakarta Sans", "5.3.0"],
  ["Work Sans", "5.3.0"],

  // Editorial Serif
  ["Source Serif 4", "5.3.1"],
  ["Merriweather", "5.3.0"],
  ["EB Garamond", "5.3.0"],
  ["Fraunces", "5.3.0"],

  // Monospaced
  ["JetBrains Mono", "5.3.0"],
  ["IBM Plex Mono", "5.3.0"],
]);

/** Font catalog of canonical family names; fonts are downloaded lazily on demand. */
export const FONTS: readonly FontName[] = [DEFAULT_FONT, ...FONTSOURCE_VERSIONS.keys()];

const FONT_SET = new Set<string>(FONTS);

export function hasFont(fontName: string): boolean {
  return FONT_SET.has(fontName);
}

export function getFonts(): readonly FontName[] {
  return FONTS;
}
