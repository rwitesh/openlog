/**
 * Restrained off-white / charcoal palette.
 * No pure black or pure white — everything sits a step away from the extremes.
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
  /** Faint separator between rows. */
  separator: string;
}

export const lightColors: ThemeColors = {
  background: "#F7F6F3",
  surface: "#FFFFFF",
  surfaceMuted: "#F0EEE9",
  text: "#2A2A27",
  textSecondary: "#7A7770",
  textTertiary: "#ABA69C",
  line: "#DEDAD1",
  marker: "#3C3A35",
  accent: "#2A2A27",
  destructive: "#9B3B3B",
  separator: "#E7E4DD",
};

export const darkColors: ThemeColors = {
  background: "#15140F",
  surface: "#1E1D18",
  surfaceMuted: "#272521",
  text: "#ECEAE3",
  textSecondary: "#9B978D",
  textTertiary: "#6B685F",
  line: "#3A382F",
  marker: "#ECEAE3",
  accent: "#ECEAE3",
  destructive: "#D98A8A",
  separator: "#2E2C26",
};
