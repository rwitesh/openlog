/**
 * Curated Paper & Ink color palettes for Kizuna.
 * Organic, editorial neutrals — calm, high-contrast, non-glaring.
 */

export interface ThemeColors {
  /** App background. */
  background: string;
  /** Elevated surface (sheets, modals, headers, cards). */
  surface: string;
  /** Subtle surface used for inputs, chips, audio players. */
  surfaceMuted: string;
  /** Primary text — entry body copy. */
  text: string;
  /** Secondary text — timestamps, metadata, labels. */
  textSecondary: string;
  /** Faint text — placeholders. */
  textTertiary: string;
  /** The continuous timeline line. */
  line: string;
  /** Timeline markers (the dots / active date badges). */
  marker: string;
  /** Accent used for highlights, active tabs, buttons. */
  accent: string;
  /** Soft destructive color for delete actions. */
  destructive: string;
  /** Positive confirmation — e.g. location attached. */
  success: string;
  /** Faint separator between rows. */
  separator: string;
}

export type PaperMood =
  | "warm"
  | "cream"
  | "sand"
  | "linen"
  | "almond"
  | "sage"
  | "moss"
  | "forest"
  | "mist"
  | "blueGrey"
  | "ocean"
  | "lavender"
  | "dustyRose"
  | "terracotta"
  | "clay"
  | "amber"
  | "midnight"
  | "plum";

export type AccentChoice =
  | "default"
  | "amber"
  | "terracotta"
  | "sage"
  | "indigo"
  | "rose"
  | "plum";

export interface AccentOption {
  id: AccentChoice;
  label: string;
  colorLight: string;
  colorDark: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "default", label: "Theme Default", colorLight: "#6B665C", colorDark: "#CDC8BE" },
  { id: "amber", label: "Amber", colorLight: "#B07928", colorDark: "#DE9F43" },
  { id: "terracotta", label: "Terracotta", colorLight: "#A65141", colorDark: "#D97B6B" },
  { id: "sage", label: "Olive Sage", colorLight: "#486E53", colorDark: "#73A37F" },
  { id: "indigo", label: "Deep Indigo", colorLight: "#3F5175", colorDark: "#7992C2" },
  { id: "rose", label: "Dusty Rose", colorLight: "#994F60", colorDark: "#CE798C" },
  { id: "plum", label: "Plum", colorLight: "#6E3E68", colorDark: "#BA79B2" },
];

export interface MoodMeta {
  id: PaperMood;
  label: string;
  swatchLight: string;
  swatchDark: string;
}

export const THEME_PALETTES: Record<
  PaperMood,
  { light: ThemeColors; dark: ThemeColors; label: string }
> = {
  warm: {
    label: "Warm Paper",
    light: {
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
    },
    dark: {
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
    },
  },
  cream: {
    label: "Cream",
    light: {
      background: "#FAF6EE",
      surface: "#FFFCF7",
      surfaceMuted: "#F0EBE0",
      text: "#2C2621",
      textSecondary: "#7D736A",
      textTertiary: "#ABA297",
      line: "#DBD3C5",
      marker: "#3C322A",
      accent: "#3C322A",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#E8E0D2",
    },
    dark: {
      background: "#151311",
      surface: "#1E1B18",
      surfaceMuted: "#27231F",
      text: "#EDE7DC",
      textSecondary: "#9E978C",
      textTertiary: "#6E685E",
      line: "#36312B",
      marker: "#EDE7DC",
      accent: "#EDE7DC",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#2A2621",
    },
  },
  sand: {
    label: "Sand",
    light: {
      background: "#F4EFE6",
      surface: "#FAF6EF",
      surfaceMuted: "#E9E2D6",
      text: "#322E27",
      textSecondary: "#7F776B",
      textTertiary: "#ADA597",
      line: "#D6CDC0",
      marker: "#3F372C",
      accent: "#3F372C",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#E3DACB",
    },
    dark: {
      background: "#161411",
      surface: "#1F1C18",
      surfaceMuted: "#28241F",
      text: "#EBE4D7",
      textSecondary: "#9E9587",
      textTertiary: "#6F675A",
      line: "#373129",
      marker: "#EBE4D7",
      accent: "#EBE4D7",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#2B2620",
    },
  },
  linen: {
    label: "Linen",
    light: {
      background: "#F0EDE6",
      surface: "#F8F6F1",
      surfaceMuted: "#E5E1D8",
      text: "#2B2A27",
      textSecondary: "#77746F",
      textTertiary: "#A3A09A",
      line: "#D2CEC5",
      marker: "#363430",
      accent: "#363430",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#E0DCD3",
    },
    dark: {
      background: "#141412",
      surface: "#1C1C19",
      surfaceMuted: "#252521",
      text: "#E7E3DC",
      textSecondary: "#9B9790",
      textTertiary: "#6C6963",
      line: "#34342E",
      marker: "#E7E3DC",
      accent: "#E7E3DC",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#282823",
    },
  },
  almond: {
    label: "Almond",
    light: {
      background: "#F6F2EB",
      surface: "#FCFAF6",
      surfaceMuted: "#EBE5DC",
      text: "#312B25",
      textSecondary: "#7E756C",
      textTertiary: "#ABA398",
      line: "#D8D0C3",
      marker: "#3D342B",
      accent: "#3D342B",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#E5DDD0",
    },
    dark: {
      background: "#171412",
      surface: "#201C19",
      surfaceMuted: "#2A2521",
      text: "#ECE6DC",
      textSecondary: "#9E968B",
      textTertiary: "#6F675D",
      line: "#38322B",
      marker: "#ECE6DC",
      accent: "#ECE6DC",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#2B2621",
    },
  },
  sage: {
    label: "Sage",
    light: {
      background: "#EBF0EA",
      surface: "#F5F8F4",
      surfaceMuted: "#DEE5DC",
      text: "#243026",
      textSecondary: "#6E7A70",
      textTertiary: "#97A399",
      line: "#CCD5CB",
      marker: "#2E3D31",
      accent: "#2E3D31",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#D8E0D7",
    },
    dark: {
      background: "#111613",
      surface: "#181E1A",
      surfaceMuted: "#202823",
      text: "#DEE5E0",
      textSecondary: "#939E96",
      textTertiary: "#677069",
      line: "#2E3932",
      marker: "#DEE5E0",
      accent: "#DEE5E0",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#242E28",
    },
  },
  moss: {
    label: "Moss",
    light: {
      background: "#E8ECE4",
      surface: "#F3F7F0",
      surfaceMuted: "#DBE1D6",
      text: "#222D1F",
      textSecondary: "#6B7767",
      textTertiary: "#95A191",
      line: "#C8D2C3",
      marker: "#2C3B29",
      accent: "#2C3B29",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#D5DECFA",
    },
    dark: {
      background: "#121611",
      surface: "#191F18",
      surfaceMuted: "#212920",
      text: "#DDE5D9",
      textSecondary: "#929D8E",
      textTertiary: "#667063",
      line: "#2E382C",
      marker: "#DDE5D9",
      accent: "#DDE5D9",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#242C23",
    },
  },
  forest: {
    label: "Forest",
    light: {
      background: "#E5ECE6",
      surface: "#F1F7F2",
      surfaceMuted: "#D7E2D9",
      text: "#1A2A20",
      textSecondary: "#627569",
      textTertiary: "#8C9F93",
      line: "#C4D3C7",
      marker: "#23372B",
      accent: "#23372B",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#D0DDD3",
    },
    dark: {
      background: "#0E1612",
      surface: "#15201A",
      surfaceMuted: "#1D2B23",
      text: "#D7E5DC",
      textSecondary: "#8A9F93",
      textTertiary: "#5E7166",
      line: "#27392E",
      marker: "#D7E5DC",
      accent: "#D7E5DC",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#1F2E25",
    },
  },
  mist: {
    label: "Mist",
    light: {
      background: "#EBECEE",
      surface: "#F6F7F9",
      surfaceMuted: "#DDE0E4",
      text: "#25282E",
      textSecondary: "#70747C",
      textTertiary: "#9DA1AA",
      line: "#CCD0D7",
      marker: "#313640",
      accent: "#313640",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#D7DBE2",
    },
    dark: {
      background: "#121316",
      surface: "#191B1F",
      surfaceMuted: "#22252B",
      text: "#DFE1E5",
      textSecondary: "#93969D",
      textTertiary: "#666970",
      line: "#2E3138",
      marker: "#DFE1E5",
      accent: "#DFE1E5",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#23262D",
    },
  },
  blueGrey: {
    label: "Blue Grey",
    light: {
      background: "#E7ECF0",
      surface: "#F4F7FA",
      surfaceMuted: "#D8E1E7",
      text: "#1E2730",
      textSecondary: "#697581",
      textTertiary: "#94A1AE",
      line: "#C6D2DC",
      marker: "#273440",
      accent: "#273440",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#D1DCE5",
    },
    dark: {
      background: "#10151A",
      surface: "#161D24",
      surfaceMuted: "#1F2832",
      text: "#DCE5ED",
      textSecondary: "#8E9CA8",
      textTertiary: "#606D7A",
      line: "#283440",
      marker: "#DCE5ED",
      accent: "#DCE5ED",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#202A34",
    },
  },
  ocean: {
    label: "Ocean",
    light: {
      background: "#E4ECEE",
      surface: "#F1F8F9",
      surfaceMuted: "#D4E1E4",
      text: "#18282E",
      textSecondary: "#62757D",
      textTertiary: "#8C9FA8",
      line: "#C2D2D7",
      marker: "#21363E",
      accent: "#21363E",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#CDDDE2",
    },
    dark: {
      background: "#0E1619",
      surface: "#142024",
      surfaceMuted: "#1B2A30",
      text: "#D7E4E7",
      textSecondary: "#8A9EA4",
      textTertiary: "#5E7076",
      line: "#25363D",
      marker: "#D7E4E7",
      accent: "#D7E4E7",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#1D2C32",
    },
  },
  lavender: {
    label: "Lavender",
    light: {
      background: "#EFEBF2",
      surface: "#F8F5FB",
      surfaceMuted: "#E2DCE6",
      text: "#2B2232",
      textSecondary: "#776D7F",
      textTertiary: "#A399AB",
      line: "#D2C9D8",
      marker: "#3A2E44",
      accent: "#3A2E44",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#DDD5E3",
    },
    dark: {
      background: "#151118",
      surface: "#1D1822",
      surfaceMuted: "#26202D",
      text: "#E6DFEB",
      textSecondary: "#9A91A1",
      textTertiary: "#6D6474",
      line: "#342C3C",
      marker: "#E6DFEB",
      accent: "#E6DFEB",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#292230",
    },
  },
  dustyRose: {
    label: "Dusty Rose",
    light: {
      background: "#F4ECEC",
      surface: "#FAF4F4",
      surfaceMuted: "#E9DDDD",
      text: "#332426",
      textSecondary: "#806D70",
      textTertiary: "#AC9A9D",
      line: "#D8C7C9",
      marker: "#422E31",
      accent: "#422E31",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#E3D4D6",
    },
    dark: {
      background: "#181213",
      surface: "#21191B",
      surfaceMuted: "#2C2123",
      text: "#EAE0E0",
      textSecondary: "#A19294",
      textTertiary: "#726567",
      line: "#3B2C2E",
      marker: "#EAE0E0",
      accent: "#EAE0E0",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#2E2124",
    },
  },
  terracotta: {
    label: "Terracotta",
    light: {
      background: "#F4ECE7",
      surface: "#FAF4EF",
      surfaceMuted: "#E8DCD5",
      text: "#362520",
      textSecondary: "#846E67",
      textTertiary: "#AF9992",
      line: "#D8C7BF",
      marker: "#473029",
      accent: "#473029",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#E3D3CB",
    },
    dark: {
      background: "#181210",
      surface: "#221A17",
      surfaceMuted: "#2D221E",
      text: "#EAE0DA",
      textSecondary: "#A2928C",
      textTertiary: "#746560",
      line: "#3C2E29",
      marker: "#EAE0DA",
      accent: "#EAE0DA",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#2E231E",
    },
  },
  clay: {
    label: "Clay",
    light: {
      background: "#EFECE8",
      surface: "#F8F5F1",
      surfaceMuted: "#E3DED8",
      text: "#2F2925",
      textSecondary: "#7A736C",
      textTertiary: "#A59E97",
      line: "#D0C9C1",
      marker: "#3B332E",
      accent: "#3B332E",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#DED6CE",
    },
    dark: {
      background: "#161311",
      surface: "#1E1A17",
      surfaceMuted: "#27221F",
      text: "#E7E2DC",
      textSecondary: "#9A938C",
      textTertiary: "#6C655F",
      line: "#36302B",
      marker: "#E7E2DC",
      accent: "#E7E2DC",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#2A2520",
    },
  },
  amber: {
    label: "Amber",
    light: {
      background: "#F6EFE3",
      surface: "#FCF7EE",
      surfaceMuted: "#EAE0D0",
      text: "#35291C",
      textSecondary: "#82725F",
      textTertiary: "#AE9E8A",
      line: "#D9CBB7",
      marker: "#453421",
      accent: "#453421",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#E5D7C2",
    },
    dark: {
      background: "#17130D",
      surface: "#211B13",
      surfaceMuted: "#2B231A",
      text: "#EBE0CE",
      textSecondary: "#A0937E",
      textTertiary: "#716552",
      line: "#3C3122",
      marker: "#EBE0CE",
      accent: "#EBE0CE",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#2D2418",
    },
  },
  midnight: {
    label: "Midnight",
    light: {
      background: "#E7E9F1",
      surface: "#F4F6FB",
      surfaceMuted: "#D8DCE7",
      text: "#1B2030",
      textSecondary: "#676F84",
      textTertiary: "#929AB1",
      line: "#C6CCE0",
      marker: "#242C43",
      accent: "#242C43",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#D1D6E7",
    },
    dark: {
      background: "#0E1119",
      surface: "#141824",
      surfaceMuted: "#1C2132",
      text: "#DFE3ED",
      textSecondary: "#8D96A8",
      textTertiary: "#5F677A",
      line: "#262E44",
      marker: "#DFE3ED",
      accent: "#DFE3ED",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#1F2538",
    },
  },
  plum: {
    label: "Plum",
    light: {
      background: "#F1EAEF",
      surface: "#FAF4F9",
      surfaceMuted: "#E4D9E2",
      text: "#2F1E29",
      textSecondary: "#7C6875",
      textTertiary: "#A794A1",
      line: "#D4C5D1",
      marker: "#3E2736",
      accent: "#3E2736",
      destructive: "#9A4545",
      success: "#3D6B4F",
      separator: "#DFD0DC",
    },
    dark: {
      background: "#170F14",
      surface: "#21151D",
      surfaceMuted: "#2B1D27",
      text: "#E7DCE4",
      textSecondary: "#9E8E9A",
      textTertiary: "#70616D",
      line: "#3A2935",
      marker: "#E7DCE4",
      accent: "#E7DCE4",
      destructive: "#D48A8A",
      success: "#6BA87A",
      separator: "#2D1E29",
    },
  },
};

export const PAPER_MOODS: MoodMeta[] = Object.entries(THEME_PALETTES).map(
  ([id, item]) => ({
    id: id as PaperMood,
    label: item.label,
    swatchLight: item.light.background,
    swatchDark: item.dark.background,
  })
);

export const lightColors: ThemeColors = THEME_PALETTES.warm.light;
export const darkColors: ThemeColors = THEME_PALETTES.warm.dark;

export function getThemeColors(
  mood: PaperMood = "warm",
  mode: "light" | "dark" = "light",
  accent: AccentChoice = "default"
): ThemeColors {
  const paletteGroup = THEME_PALETTES[mood] ?? THEME_PALETTES.warm;
  const base = mode === "dark" ? paletteGroup.dark : paletteGroup.light;

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
