import type { FontName } from "./types";

export const DEFAULT_FONT: FontName = "Source Sans 3";

/**
 * Font catalog containing canonical font family names.
 * The catalog is metadata — fonts are downloaded lazily on demand.
 */
export const FONTS: readonly FontName[] = [
  "Source Sans 3",
  "Inter",
  "Geist",
  "IBM Plex Sans",
  "Noto Sans",
  "Open Sans",
  "Roboto",
  "Lato",
  "Work Sans",
  "Manrope",
  "DM Sans",
  "Plus Jakarta Sans",
  "Public Sans",
  "Nunito Sans",
  "Figtree",
  "Rubik",
  "Ubuntu",
  "Assistant",
  "Hind",
  "Heebo",
  "Mulish",
  "Outfit",
  "Urbanist",
  "Albert Sans",
  "Instrument Sans",
  "Onest",
  "Atkinson Hyperlegible",

  "Source Serif 4",
  "Noto Serif",
  "Merriweather",
  "Lora",
  "Libre Baskerville",
  "EB Garamond",
  "Cormorant Garamond",
  "Playfair Display",
  "DM Serif Display",
  "Spectral",
  "Crimson Pro",
  "Newsreader",
  "Fraunces",
  "Literata",
  "Vollkorn",
  "Alegreya",
  "Bitter",
  "Roboto Slab",
  "Zilla Slab",

  "Space Grotesk",
  "Space Mono",
  "Bebas Neue",
  "Archivo Black",
  "Anton",
  "Barlow Condensed",
  "Oswald",
  "League Spartan",
  "Sora",
  "Syne",
  "Unbounded",
  "Michroma",
  "Exo 2",
  "Rajdhani",
  "Oxanium",
  "Audiowide",
  "Josefin Sans",
  "Righteous",
  "Cinzel",

  "Nunito",
  "Quicksand",
  "Comfortaa",
  "Varela Round",
  "Baloo 2",
  "Fredoka",
  "M PLUS Rounded 1c",
  "DynaPuff",
  "Sniglet",
  "Bubblegum Sans",

  "JetBrains Mono",
  "IBM Plex Mono",
  "Source Code Pro",
  "Fira Code",
  "Fira Mono",
  "Inconsolata",
  "Roboto Mono",
  "Ubuntu Mono",
  "Cousine",
  "Anonymous Pro",
  "Azeret Mono",

  "Caveat",
  "Dancing Script",
  "Pacifico",
  "Kalam",
  "Patrick Hand",
  "Indie Flower",
  "Permanent Marker",
  "Satisfy",
  "Sacramento",
  "Shadows Into Light",
  "Comforter",
  "Homemade Apple",

  "Instrument Serif",
  "Libre Caslon Display",
  "Gloock",
  "Cardo",
  "Old Standard TT",
  "Bodoni Moda",
] as const;

const FONT_SET = new Set<string>(FONTS);

export function hasFont(fontName: string): boolean {
  return FONT_SET.has(fontName);
}

export function getFonts(): readonly FontName[] {
  return FONTS;
}
