/**
 * Warm paper palette inspired by calm journal apps.
 * Soft neutrals — no harsh black or clinical white.
 */

export interface ThemeColors {
  /** App background. */
  background: string;
  /** Elevated surface (sheets, modals, headers). */
  surface: string;
  /** Subtle surface used for inputs and chips. */
  surfaceMuted: string;
  /** Primary text — entry body copy. */
  text: string;
  /** Secondary text — timestamps, metadata, labels. */
  textSecondary: string;
  /** Faint text — placeholders. */
  textTertiary: string;
  /** The continuous timeline line. */
  line: string;
  /** Timeline markers (the dots). */
  marker: string;
  /** Accent used very sparingly. */
  accent: string;
  /** Soft destructive color for delete actions. */
  destructive: string;
  /** Positive confirmation — e.g. location attached. */
  success: string;
  /** Faint separator between rows. */
  separator: string;
}

export const lightColors: ThemeColors = {
  background: "#F3F0E8",
  surface: "#FBFAF6",
  surfaceMuted: "#EAE6DC",
  text: "#2E2D28",
  textSecondary: "#7A756A",
  textTertiary: "#A8A093",
  line: "#D5CFC3",
  marker: "#3A3832",
  accent: "#3A3832",
  destructive: "#9A4545",
  success: "#3D6B4F",
  separator: "#E3DDD2",
};

export const darkColors: ThemeColors = {
  background: "#141310",
  surface: "#1C1B17",
  surfaceMuted: "#25231E",
  text: "#E9E6DD",
  textSecondary: "#9C978C",
  textTertiary: "#6E6A61",
  line: "#35322C",
  marker: "#E9E6DD",
  accent: "#E9E6DD",
  destructive: "#D48A8A",
  success: "#6BA87A",
  separator: "#2A2823",
};
