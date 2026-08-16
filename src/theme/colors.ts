export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  line: string;
  marker: string;
  accent: string;
  destructive: string;
  success: string;
  separator: string;
}

export interface ThemeBackgroundConfig {
  readonly imageUri?: string | null;
}

export type AccentChoice =
  | "default"
  | "neutral"
  | "crimson"
  | "ruby"
  | "rose"
  | "pink"
  | "coral"
  | "terracotta"
  | "orange"
  | "amber"
  | "gold"
  | "butter"
  | "lime"
  | "green"
  | "forest"
  | "sage"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "denim"
  | "indigo"
  | "violet"
  | "purple"
  | "plum";

export interface AccentOption {
  id: AccentChoice;
  label: string;
  tagline: string;
  colorLight: string;
  colorDark: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "default", label: "Default", tagline: "Systematic graphite ink", colorLight: "#6B665C", colorDark: "#CDC8BE" },
  { id: "terracotta", label: "Terracotta", tagline: "Earthy baked clay", colorLight: "#A24E38", colorDark: "#DC7A64" },
  { id: "amber", label: "Amber", tagline: "Warm golden honey", colorLight: "#B47318", colorDark: "#E69F38" },
  { id: "sage", label: "Sage", tagline: "Calm botanical pine", colorLight: "#446E52", colorDark: "#76A886" },
  { id: "denim", label: "Denim", tagline: "Classic indigo wash", colorLight: "#335C8D", colorDark: "#6D9ECC" },
  { id: "crimson", label: "Crimson", tagline: "Deep vermillion red", colorLight: "#B3261E", colorDark: "#F26C68" },
  { id: "rose", label: "Rose", tagline: "Muted dusty berry", colorLight: "#A63D5C", colorDark: "#DD6F8E" },
  { id: "violet", label: "Violet", tagline: "Quiet meditative purple", colorLight: "#5B32A8", colorDark: "#9C6EF5" },
  { id: "teal", label: "Teal", tagline: "Deep ocean seafoam", colorLight: "#19786A", colorDark: "#4CBAA8" },
  { id: "forest", label: "Forest", tagline: "Rich evergreen foliage", colorLight: "#1B5E20", colorDark: "#43A047" },
  { id: "sky", label: "Sky", tagline: "Morning sapphire air", colorLight: "#0288D1", colorDark: "#4FC3F7" },
  { id: "coral", label: "Coral", tagline: "Warm sunlit apricot", colorLight: "#C04B40", colorDark: "#EA796F" },
  { id: "plum", label: "Plum", tagline: "Velvet dark orchid", colorLight: "#7E3576", colorDark: "#C76BC0" },
  { id: "neutral", label: "Slate", tagline: "Balanced neutral slate", colorLight: "#64748B", colorDark: "#94A3B8" },
  { id: "gold", label: "Gold", tagline: "Refined metallic amber", colorLight: "#A17A10", colorDark: "#E0B538" },
  { id: "cyan", label: "Cyan", tagline: "Vibrant icy aquamarine", colorLight: "#157A8C", colorDark: "#4EC0D6" },
];

/** Canonical Gallery-White Light Theme Foundation */
export const KIZUNA_LIGHT_THEME: ThemeColors = {
  background: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceMuted: "#F2EFE9",
  text: "#181614",
  textSecondary: "#6E675F",
  textTertiary: "#9E968C",
  line: "#DED7CC",
  marker: "#181614",
  accent: "#7C5828",
  destructive: "#B82C2C",
  success: "#2E7D4E",
  separator: "#E8E2D6",
};

/** Canonical Charcoal-Black Dark Theme Foundation */
export const KIZUNA_DARK_THEME: ThemeColors = {
  background: "#121215",
  surface: "#191A1E",
  surfaceMuted: "#23242A",
  text: "#F2F2F5",
  textSecondary: "#9697A3",
  textTertiary: "#666774",
  line: "#2C2D37",
  marker: "#F2F2F5",
  accent: "#E2B376",
  destructive: "#E06B6B",
  success: "#52C47D",
  separator: "#222329",
};

export const lightColors: ThemeColors = KIZUNA_LIGHT_THEME;
export const darkColors: ThemeColors = KIZUNA_DARK_THEME;

export function getThemeColors(
  mode: "light" | "dark" = "light",
  accent: AccentChoice = "default"
): ThemeColors {
  const base = mode === "dark" ? KIZUNA_DARK_THEME : KIZUNA_LIGHT_THEME;

  if (accent !== "default") {
    const option = ACCENT_OPTIONS.find((opt) => opt.id === accent);
    if (option) {
      const chosenColor = mode === "dark" ? option.colorDark : option.colorLight;
      return {
        ...base,
        accent: chosenColor,
        marker: chosenColor,
      };
    }
  }

  return base;
}
