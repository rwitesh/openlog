import type { FontName } from "./types";

export const DEFAULT_FONT: FontName = "Source Sans 3";

/**
 * Font catalog containing canonical font family names.
 * The catalog is metadata — fonts are downloaded lazily on demand.
 */
export const FONTS: readonly FontName[] = [
  // Modern Sans
  "Source Sans 3",
  "Inter",
  "Geist",
  "Plus Jakarta Sans",
  "Work Sans",
  "Manrope",
  "DM Sans",
  "Outfit",
  "Instrument Sans",
  "Public Sans",

  // Editorial Serif
  "Source Serif 4",
  "Merriweather",
  "Lora",
  "EB Garamond",
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Newsreader",
  "Fraunces",
  "Instrument Serif",
  "Crimson Pro",

  // Monospaced
  "JetBrains Mono",
  "IBM Plex Mono",
  "Fira Code",
  "Source Code Pro",
  "Space Mono",
  "Roboto Mono",

  // Handwriting & Intimate
  "Caveat",
  "Indie Flower",
  "Patrick Hand",
  "Shadows Into Light",
  "Kalam",
  "Dancing Script",
] as const;

const FONT_SET = new Set<string>(FONTS);

export function hasFont(fontName: string): boolean {
  return FONT_SET.has(fontName);
}

export function getFonts(): readonly FontName[] {
  return FONTS;
}
