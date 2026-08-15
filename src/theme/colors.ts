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
  readonly imageUri?: string;
  readonly blur?: number;
  readonly opacity?: number;
  readonly overlayIntensity?: number;
  readonly surfaceTransparency?: number;
}

export type ThemePaletteId =
  | "monochrome"
  | "warm"
  | "cream"
  | "sand"
  | "charcoal"
  | "softYellow"
  | "peach"
  | "apricot"
  | "terracotta"
  | "coral"
  | "crimson"
  | "blush"
  | "rose"
  | "lavender"
  | "indigo"
  | "plum"
  | "ocean"
  | "sky"
  | "denim"
  | "midnight"
  | "mint"
  | "sage"
  | "moss"
  | "forest"
  | "teal"
  // Legacy aliases for backward compatibility
  | "linen"
  | "almond"
  | "mist"
  | "blueGrey"
  | "dustyRose"
  | "clay"
  | "amber";

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
  colorLight: string;
  colorDark: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "default", label: "Default", colorLight: "#6B665C", colorDark: "#CDC8BE" },
  { id: "neutral", label: "Neutral", colorLight: "#64748B", colorDark: "#94A3B8" },
  { id: "crimson", label: "Crimson", colorLight: "#B3261E", colorDark: "#F26C68" },
  { id: "ruby", label: "Ruby", colorLight: "#C2185B", colorDark: "#F48FB1" },
  { id: "rose", label: "Rose", colorLight: "#A63D5C", colorDark: "#DD6F8E" },
  { id: "pink", label: "Pink", colorLight: "#A83C7B", colorDark: "#DF6CB1" },
  { id: "coral", label: "Coral", colorLight: "#C04B40", colorDark: "#EA796F" },
  { id: "terracotta", label: "Terracotta", colorLight: "#A24E38", colorDark: "#DC7A64" },
  { id: "orange", label: "Orange", colorLight: "#B85514", colorDark: "#E87D38" },
  { id: "amber", label: "Amber", colorLight: "#B47318", colorDark: "#E69F38" },
  { id: "gold", label: "Gold", colorLight: "#A17A10", colorDark: "#E0B538" },
  { id: "butter", label: "Butter", colorLight: "#9E8204", colorDark: "#F0CF4A" },
  { id: "lime", label: "Lime", colorLight: "#5E7714", colorDark: "#9FB838" },
  { id: "green", label: "Green", colorLight: "#2D753D", colorDark: "#5CB86F" },
  { id: "forest", label: "Forest", colorLight: "#1B5E20", colorDark: "#43A047" },
  { id: "sage", label: "Sage", colorLight: "#446E52", colorDark: "#76A886" },
  { id: "teal", label: "Teal", colorLight: "#19786A", colorDark: "#4CBAA8" },
  { id: "cyan", label: "Cyan", colorLight: "#157A8C", colorDark: "#4EC0D6" },
  { id: "sky", label: "Sky", colorLight: "#0288D1", colorDark: "#4FC3F7" },
  { id: "blue", label: "Blue", colorLight: "#2563A8", colorDark: "#61A1EB" },
  { id: "denim", label: "Denim", colorLight: "#335C8D", colorDark: "#6D9ECC" },
  { id: "indigo", label: "Indigo", colorLight: "#434EB0", colorDark: "#7E8BF0" },
  { id: "violet", label: "Violet", colorLight: "#5B32A8", colorDark: "#9C6EF5" },
  { id: "purple", label: "Purple", colorLight: "#644099", colorDark: "#A37CE3" },
  { id: "plum", label: "Plum", colorLight: "#7E3576", colorDark: "#C76BC0" },
];

export interface ThemeOption {
  id: ThemePaletteId;
  label: string;
  category: "quiet" | "expressive";
  tagline: string;
  swatchLight: string;
  swatchDark: string;
}

export const THEME_PALETTES: Record<
  ThemePaletteId,
  { light: ThemeColors; dark: ThemeColors; label: string }
> = {
  // 1. Gallery White
  monochrome: {
    label: "Gallery White",
    light: {
      background: "#FFFFFF",
      surface: "#F5F6F8",
      surfaceMuted: "#E9EBEF",
      text: "#121316",
      textSecondary: "#5F636E",
      textTertiary: "#8F94A0",
      line: "#D2D6DE",
      marker: "#121316",
      accent: "#1E2128",
      destructive: "#B3261E",
      success: "#227844",
      separator: "#E3E6ED",
    },
    dark: {
      background: "#0A0B0E",
      surface: "#14161B",
      surfaceMuted: "#1E2027",
      text: "#F0F1F4",
      textSecondary: "#969BA6",
      textTertiary: "#656975",
      line: "#2D3039",
      marker: "#F0F1F4",
      accent: "#E2E5EE",
      destructive: "#E06A6A",
      success: "#57C27D",
      separator: "#242730",
    },
  },

  // 2. Warm Ivory
  warm: {
    label: "Warm Ivory",
    light: {
      background: "#F7F2E8",
      surface: "#FCFAF4",
      surfaceMuted: "#ECE4D4",
      text: "#2B241C",
      textSecondary: "#756758",
      textTertiary: "#A19382",
      line: "#D6CBBF",
      marker: "#42372A",
      accent: "#7C5828",
      destructive: "#A83636",
      success: "#367248",
      separator: "#E2D7CC",
    },
    dark: {
      background: "#16130F",
      surface: "#211D17",
      surfaceMuted: "#2C2720",
      text: "#EFE9DF",
      textSecondary: "#A59B8E",
      textTertiary: "#746B5F",
      line: "#3E372D",
      marker: "#EFE9DF",
      accent: "#DEB275",
      destructive: "#E07878",
      success: "#69BD82",
      separator: "#2F2920",
    },
  },

  // 3. Cream
  cream: {
    label: "Cream",
    light: {
      background: "#FAF3DE",
      surface: "#FFFBF0",
      surfaceMuted: "#EFE5C6",
      text: "#302514",
      textSecondary: "#7A6A50",
      textTertiary: "#A4947A",
      line: "#D9CEB4",
      marker: "#463720",
      accent: "#966E20",
      destructive: "#A8382E",
      success: "#387545",
      separator: "#E5DBBF",
    },
    dark: {
      background: "#18140B",
      surface: "#231E12",
      surfaceMuted: "#302A1A",
      text: "#F0E7D2",
      textSecondary: "#A89C82",
      textTertiary: "#776C55",
      line: "#423A26",
      marker: "#F0E7D2",
      accent: "#E7B547",
      destructive: "#E27E72",
      success: "#6EC27A",
      separator: "#322B18",
    },
  },

  // 4. Sand
  sand: {
    label: "Sand",
    light: {
      background: "#EFE7DB",
      surface: "#F8F3EA",
      surfaceMuted: "#E2D6C4",
      text: "#2E261D",
      textSecondary: "#756656",
      textTertiary: "#9E8E7D",
      line: "#CFC2B0",
      marker: "#463A2E",
      accent: "#87653C",
      destructive: "#A83838",
      success: "#367046",
      separator: "#DBD0C0",
    },
    dark: {
      background: "#1B1612",
      surface: "#26201A",
      surfaceMuted: "#332B24",
      text: "#ECE4DC",
      textSecondary: "#A69B90",
      textTertiary: "#776D63",
      line: "#443B33",
      marker: "#ECE4DC",
      accent: "#D8B282",
      destructive: "#E07878",
      success: "#69BD82",
      separator: "#332A22",
    },
  },

  // 5. Charcoal
  charcoal: {
    label: "Charcoal",
    light: {
      background: "#18191C",
      surface: "#222428",
      surfaceMuted: "#2D2F35",
      text: "#F0F1F4",
      textSecondary: "#9B9FA9",
      textTertiary: "#6C707A",
      line: "#3B3D44",
      marker: "#E2E4EB",
      accent: "#D4D7E2",
      destructive: "#F07676",
      success: "#50DB89",
      separator: "#2E3037",
    },
    dark: {
      background: "#101114",
      surface: "#18191E",
      surfaceMuted: "#22242B",
      text: "#ECEEF1",
      textSecondary: "#92959E",
      textTertiary: "#62646D",
      line: "#2A2B32",
      marker: "#ECEEF1",
      accent: "#C9CCD8",
      destructive: "#DF7474",
      success: "#46D380",
      separator: "#1E2026",
    },
  },

  // 6. Butter
  softYellow: {
    label: "Butter",
    light: {
      background: "#FDF6D8",
      surface: "#FFFBEC",
      surfaceMuted: "#F5E9B8",
      text: "#33270B",
      textSecondary: "#7B6634",
      textTertiary: "#A38E5A",
      line: "#DDD09E",
      marker: "#4C3A12",
      accent: "#9E7412",
      destructive: "#A6382A",
      success: "#32743C",
      separator: "#EAE0B2",
    },
    dark: {
      background: "#191508",
      surface: "#241F0E",
      surfaceMuted: "#312B16",
      text: "#F2E8CE",
      textSecondary: "#A99D78",
      textTertiary: "#786D4C",
      line: "#463E20",
      marker: "#F2E8CE",
      accent: "#E5BD3E",
      destructive: "#E07B6E",
      success: "#6BC076",
      separator: "#332B13",
    },
  },

  // 7. Peach
  peach: {
    label: "Peach",
    light: {
      background: "#FDEEE2",
      surface: "#FFF7F0",
      surfaceMuted: "#F8DDCB",
      text: "#3B2217",
      textSecondary: "#845B4A",
      textTertiary: "#B08775",
      line: "#E2C3AF",
      marker: "#543122",
      accent: "#B8552E",
      destructive: "#AB3636",
      success: "#367246",
      separator: "#ECCDBA",
    },
    dark: {
      background: "#1A120D",
      surface: "#251B14",
      surfaceMuted: "#33251D",
      text: "#F2E3DA",
      textSecondary: "#AB9083",
      textTertiary: "#7A6458",
      line: "#46352B",
      marker: "#F2E3DA",
      accent: "#EB865E",
      destructive: "#E47D7D",
      success: "#6ABD7F",
      separator: "#332219",
    },
  },

  // 8. Apricot
  apricot: {
    label: "Apricot",
    light: {
      background: "#FCE7D0",
      surface: "#FFF2E4",
      surfaceMuted: "#F6D3B1",
      text: "#3E1F0F",
      textSecondary: "#875135",
      textTertiary: "#B0785C",
      line: "#DFB592",
      marker: "#582B14",
      accent: "#C2561C",
      destructive: "#AF3424",
      success: "#317343",
      separator: "#E9C4A2",
    },
    dark: {
      background: "#1D120A",
      surface: "#281A10",
      surfaceMuted: "#372518",
      text: "#F4E2D3",
      textSecondary: "#B28F79",
      textTertiary: "#7E614F",
      line: "#4A3424",
      marker: "#F4E2D3",
      accent: "#F08B48",
      destructive: "#EF4444",
      success: "#22C55E",
      separator: "#362114",
    },
  },

  // 9. Terracotta
  terracotta: {
    label: "Terracotta",
    light: {
      background: "#F2E0D4",
      surface: "#FAECE2",
      surfaceMuted: "#E4C7B5",
      text: "#382017",
      textSecondary: "#7B5242",
      textTertiary: "#A27766",
      line: "#CFAB97",
      marker: "#4F2D21",
      accent: "#9E4628",
      destructive: "#A43226",
      success: "#336E44",
      separator: "#DCC0B0",
    },
    dark: {
      background: "#1C110C",
      surface: "#261811",
      surfaceMuted: "#342219",
      text: "#EFE0D7",
      textSecondary: "#A98C7F",
      textTertiary: "#785F54",
      line: "#473227",
      marker: "#EFE0D7",
      accent: "#E57954",
      destructive: "#DE7575",
      success: "#65B87E",
      separator: "#331F16",
    },
  },

  // 10. Coral
  coral: {
    label: "Coral",
    light: {
      background: "#FCE4DC",
      surface: "#FFF0EA",
      surfaceMuted: "#F6CBC0",
      text: "#3D1B17",
      textSecondary: "#884F48",
      textTertiary: "#AF7971",
      line: "#DEABA2",
      marker: "#562822",
      accent: "#BD4335",
      destructive: "#A82E2E",
      success: "#327146",
      separator: "#E8BEB5",
    },
    dark: {
      background: "#1D100E",
      surface: "#281714",
      surfaceMuted: "#37201C",
      text: "#F3E0DD",
      textSecondary: "#AD8C87",
      textTertiary: "#7B5F5A",
      line: "#4A2E29",
      marker: "#F3E0DD",
      accent: "#EB6F60",
      destructive: "#DE7070",
      success: "#62B87B",
      separator: "#371D18",
    },
  },

  // 11. Crimson
  crimson: {
    label: "Crimson",
    light: {
      background: "#FCE4E6",
      surface: "#FFF0F1",
      surfaceMuted: "#F7CBD0",
      text: "#3D141A",
      textSecondary: "#88424E",
      textTertiary: "#AF6E7A",
      line: "#DDA1AC",
      marker: "#571E27",
      accent: "#B8283E",
      destructive: "#A82230",
      success: "#307044",
      separator: "#E8B5BE",
    },
    dark: {
      background: "#1E0C10",
      surface: "#291217",
      surfaceMuted: "#391A20",
      text: "#F4DFE3",
      textSecondary: "#AE868D",
      textTertiary: "#7C5960",
      line: "#4D252E",
      marker: "#F4DFE3",
      accent: "#EC556F",
      destructive: "#EF4444",
      success: "#22C55E",
      separator: "#39171E",
    },
  },

  // 12. Blush
  blush: {
    label: "Blush",
    light: {
      background: "#FDE7ED",
      surface: "#FFF2F6",
      surfaceMuted: "#F8D0DC",
      text: "#3A1825",
      textSecondary: "#854B60",
      textTertiary: "#AD768B",
      line: "#DDAABF",
      marker: "#532336",
      accent: "#B43A67",
      destructive: "#A42E3C",
      success: "#33714A",
      separator: "#E9BDCE",
    },
    dark: {
      background: "#1C0F15",
      surface: "#26161E",
      surfaceMuted: "#341F2A",
      text: "#F3DFE7",
      textSecondary: "#AA8493",
      textTertiary: "#785966",
      line: "#472C3A",
      marker: "#F3DFE7",
      accent: "#E56E97",
      destructive: "#E0757C",
      success: "#67BA82",
      separator: "#331B27",
    },
  },

  // 13. Rose
  rose: {
    label: "Rose",
    light: {
      background: "#F5E0E7",
      surface: "#FCEDF2",
      surfaceMuted: "#E7C6D2",
      text: "#381A26",
      textSecondary: "#7C4B5E",
      textTertiary: "#A37083",
      line: "#CFA7B7",
      marker: "#4E2536",
      accent: "#99375C",
      destructive: "#9F2B36",
      success: "#316E47",
      separator: "#DBB9C7",
    },
    dark: {
      background: "#1C1016",
      surface: "#261720",
      surfaceMuted: "#34212C",
      text: "#EFE0E6",
      textSecondary: "#A88B98",
      textTertiary: "#775F6B",
      line: "#46303C",
      marker: "#EFE0E6",
      accent: "#D86B93",
      destructive: "#E8646E",
      success: "#58B878",
      separator: "#331D2A",
    },
  },

  // 14. Lavender
  lavender: {
    label: "Lavender",
    light: {
      background: "#F3ECF9",
      surface: "#FAF5FD",
      surfaceMuted: "#E4D5F1",
      text: "#2C1A3E",
      textSecondary: "#6E5088",
      textTertiary: "#977BB1",
      line: "#C6B2DE",
      marker: "#41275C",
      accent: "#753EAF",
      destructive: "#9E3244",
      success: "#31704D",
      separator: "#D5C4EC",
    },
    dark: {
      background: "#150F1D",
      surface: "#1F162A",
      surfaceMuted: "#2C203A",
      text: "#EBE2F4",
      textSecondary: "#9F8CB2",
      textTertiary: "#6F5E82",
      line: "#3E2E50",
      marker: "#EBE2F4",
      accent: "#A774E5",
      destructive: "#DF7A88",
      success: "#68BF89",
      separator: "#2B1D3B",
    },
  },

  // 15. Violet
  indigo: {
    label: "Violet",
    light: {
      background: "#EFEAF8",
      surface: "#F7F3FD",
      surfaceMuted: "#DCD2F0",
      text: "#24183E",
      textSecondary: "#604D86",
      textTertiary: "#8977AE",
      line: "#B8A7DC",
      marker: "#37255E",
      accent: "#6035B3",
      destructive: "#9A2F42",
      success: "#2D6E48",
      separator: "#CBC0E8",
    },
    dark: {
      background: "#120D20",
      surface: "#1B1430",
      surfaceMuted: "#271E42",
      text: "#E7E0F5",
      textSecondary: "#9787B6",
      textTertiary: "#675886",
      line: "#362A55",
      marker: "#E7E0F5",
      accent: "#9468ED",
      destructive: "#EF4444",
      success: "#22C55E",
      separator: "#261A43",
    },
  },

  // 16. Plum
  plum: {
    label: "Plum",
    light: {
      background: "#F5E8F3",
      surface: "#FDF2FB",
      surfaceMuted: "#E8D1E4",
      text: "#351833",
      textSecondary: "#764872",
      textTertiary: "#9D7199",
      line: "#CCA5C8",
      marker: "#4D254A",
      accent: "#8F3689",
      destructive: "#9A2B42",
      success: "#2F6E4A",
      separator: "#DAB8D6",
    },
    dark: {
      background: "#180D18",
      surface: "#231423",
      surfaceMuted: "#311D31",
      text: "#EFE0EE",
      textSecondary: "#A58BA3",
      textTertiary: "#745D73",
      line: "#432943",
      marker: "#EFE0EE",
      accent: "#CF65C8",
      destructive: "#EF4444",
      success: "#22C55E",
      separator: "#301A30",
    },
  },

  // 17. Cyan
  ocean: {
    label: "Cyan",
    light: {
      background: "#E5F5F7",
      surface: "#F2FAFB",
      surfaceMuted: "#CEECEF",
      text: "#102C32",
      textSecondary: "#4A6D74",
      textTertiary: "#76989F",
      line: "#ACCED4",
      marker: "#194149",
      accent: "#1A7B8B",
      destructive: "#9E3339",
      success: "#296F52",
      separator: "#BDDDE3",
    },
    dark: {
      background: "#0A1518",
      surface: "#112024",
      surfaceMuted: "#1A2D33",
      text: "#DCEEF1",
      textSecondary: "#83A4AA",
      textTertiary: "#55757B",
      line: "#263E44",
      marker: "#DCEEF1",
      accent: "#47BDD2",
      destructive: "#DE7A80",
      success: "#5CBD93",
      separator: "#1C3036",
    },
  },

  // 18. Sky
  sky: {
    label: "Sky",
    light: {
      background: "#E8F2FC",
      surface: "#F4F8FE",
      surfaceMuted: "#D3E5F8",
      text: "#12263C",
      textSecondary: "#4B6582",
      textTertiary: "#7892AE",
      line: "#AFC8E4",
      marker: "#1C3958",
      accent: "#236CB2",
      destructive: "#A13438",
      success: "#2D6F4B",
      separator: "#BFD7F0",
    },
    dark: {
      background: "#0C141F",
      surface: "#131E2C",
      surfaceMuted: "#1C2A3D",
      text: "#DDE8F4",
      textSecondary: "#829DB8",
      textTertiary: "#546E88",
      line: "#263B53",
      marker: "#DDE8F4",
      accent: "#56A1EC",
      destructive: "#DF7C7C",
      success: "#63BD86",
      separator: "#1C2B3E",
    },
  },

  // 19. Denim
  denim: {
    label: "Denim",
    light: {
      background: "#E1EBF5",
      surface: "#EEF4FA",
      surfaceMuted: "#C8DBED",
      text: "#16283C",
      textSecondary: "#4B6480",
      textTertiary: "#758DA8",
      line: "#A6BFDA",
      marker: "#223B58",
      accent: "#2D6298",
      destructive: "#A13438",
      success: "#2A6D4B",
      separator: "#B7CFE7",
    },
    dark: {
      background: "#0E1724",
      surface: "#152233",
      surfaceMuted: "#1F2E43",
      text: "#DEE8F3",
      textSecondary: "#849DB8",
      textTertiary: "#566E87",
      line: "#2A3F59",
      marker: "#DEE8F3",
      accent: "#5D99D8",
      destructive: "#EF4444",
      success: "#22C55E",
      separator: "#1F3147",
    },
  },

  // 20. Navy
  midnight: {
    label: "Navy",
    light: {
      background: "#111A2B",
      surface: "#19253C",
      surfaceMuted: "#23324E",
      text: "#E3EDFB",
      textSecondary: "#8EB3E6",
      textTertiary: "#5E84BA",
      line: "#324B75",
      marker: "#65A5FD",
      accent: "#509BFE",
      destructive: "#F07684",
      success: "#4CD49B",
      separator: "#273C62",
    },
    dark: {
      background: "#080E1A",
      surface: "#0F182A",
      surfaceMuted: "#17233B",
      text: "#DBE8FC",
      textSecondary: "#7FAEF0",
      textTertiary: "#4E76B1",
      line: "#1F345C",
      marker: "#DBE8FC",
      accent: "#4594FD",
      destructive: "#DF7280",
      success: "#42D093",
      separator: "#182847",
    },
  },

  // 21. Mint
  mint: {
    label: "Mint",
    light: {
      background: "#E5F6EC",
      surface: "#F2FAF5",
      surfaceMuted: "#CEEED9",
      text: "#122E1F",
      textSecondary: "#477158",
      textTertiary: "#739C84",
      line: "#A8D4BC",
      marker: "#1D4630",
      accent: "#237E4D",
      destructive: "#9F3333",
      success: "#267746",
      separator: "#BCE2CD",
    },
    dark: {
      background: "#0B1610",
      surface: "#12221A",
      surfaceMuted: "#1B3025",
      text: "#DCEFE4",
      textSecondary: "#82A792",
      textTertiary: "#547764",
      line: "#264334",
      marker: "#DCEFE4",
      accent: "#50C885",
      destructive: "#EF4444",
      success: "#22C55E",
      separator: "#1A3326",
    },
  },

  // 22. Sage
  sage: {
    label: "Sage",
    light: {
      background: "#EBF2EC",
      surface: "#F6FAF7",
      surfaceMuted: "#D7E6DA",
      text: "#1E2C22",
      textSecondary: "#586E5D",
      textTertiary: "#839988",
      line: "#B8CCC0",
      marker: "#2E4334",
      accent: "#3D714C",
      destructive: "#9C3737",
      success: "#326D45",
      separator: "#CADBD0",
    },
    dark: {
      background: "#101612",
      surface: "#17201A",
      surfaceMuted: "#212C24",
      text: "#E2EBE4",
      textSecondary: "#8C9E91",
      textTertiary: "#5F7064",
      line: "#2D3B31",
      marker: "#E2EBE4",
      accent: "#6CB282",
      destructive: "#DF7C7C",
      success: "#5EBF83",
      separator: "#222E26",
    },
  },

  // 23. Olive
  moss: {
    label: "Olive",
    light: {
      background: "#EDF0E3",
      surface: "#F6F8EF",
      surfaceMuted: "#DCE2CD",
      text: "#252D16",
      textSecondary: "#626D4D",
      textTertiary: "#8C9776",
      line: "#BCC6A6",
      marker: "#374322",
      accent: "#566E29",
      destructive: "#9E382E",
      success: "#376C3E",
      separator: "#CED8B8",
    },
    dark: {
      background: "#13160D",
      surface: "#1B2014",
      surfaceMuted: "#252C1C",
      text: "#E5E9D8",
      textSecondary: "#939C82",
      textTertiary: "#656E54",
      line: "#323B26",
      marker: "#E5E9D8",
      accent: "#87A64C",
      destructive: "#EF4444",
      success: "#22C55E",
      separator: "#252D1A",
    },
  },

  // 24. Forest
  forest: {
    label: "Forest",
    light: {
      background: "#122418",
      surface: "#1B3323",
      surfaceMuted: "#264430",
      text: "#E3F2E7",
      textSecondary: "#93C2A1",
      textTertiary: "#629471",
      line: "#345C42",
      marker: "#56DF8E",
      accent: "#42D480",
      destructive: "#F07676",
      success: "#52DC8B",
      separator: "#2A4B36",
    },
    dark: {
      background: "#09140E",
      surface: "#102017",
      surfaceMuted: "#172C20",
      text: "#DCEDE1",
      textSecondary: "#83BA96",
      textTertiary: "#528966",
      line: "#22402F",
      marker: "#DCEDE1",
      accent: "#3ECC7C",
      destructive: "#DF7676",
      success: "#4EDE86",
      separator: "#193424",
    },
  },

  // 25. Teal
  teal: {
    label: "Teal",
    light: {
      background: "#0E2328",
      surface: "#15333A",
      surfaceMuted: "#1E434C",
      text: "#E0F1F4",
      textSecondary: "#88BDC7",
      textTertiary: "#578E99",
      line: "#2C5A64",
      marker: "#42D3EA",
      accent: "#32C7DF",
      destructive: "#F0767E",
      success: "#48D9A8",
      separator: "#224851",
    },
    dark: {
      background: "#071316",
      surface: "#0D1E22",
      surfaceMuted: "#152A30",
      text: "#D8ECF0",
      textSecondary: "#79B4BF",
      textTertiary: "#49818C",
      line: "#1C3A42",
      marker: "#D8ECF0",
      accent: "#2BBED6",
      destructive: "#DF7474",
      success: "#42D4A2",
      separator: "#162E34",
    },
  },

  // Legacy aliases for backward compatibility
  linen: {
    label: "Linen",
    get light() {
      return THEME_PALETTES.monochrome.light;
    },
    get dark() {
      return THEME_PALETTES.monochrome.dark;
    },
  },
  almond: {
    label: "Almond",
    get light() {
      return THEME_PALETTES.cream.light;
    },
    get dark() {
      return THEME_PALETTES.cream.dark;
    },
  },
  mist: {
    label: "Mist",
    get light() {
      return THEME_PALETTES.sky.light;
    },
    get dark() {
      return THEME_PALETTES.sky.dark;
    },
  },
  blueGrey: {
    label: "Blue Grey",
    get light() {
      return THEME_PALETTES.denim.light;
    },
    get dark() {
      return THEME_PALETTES.denim.dark;
    },
  },
  dustyRose: {
    label: "Dusty Rose",
    get light() {
      return THEME_PALETTES.rose.light;
    },
    get dark() {
      return THEME_PALETTES.rose.dark;
    },
  },
  clay: {
    label: "Clay",
    get light() {
      return THEME_PALETTES.terracotta.light;
    },
    get dark() {
      return THEME_PALETTES.terracotta.dark;
    },
  },
  amber: {
    label: "Amber",
    get light() {
      return THEME_PALETTES.apricot.light;
    },
    get dark() {
      return THEME_PALETTES.apricot.dark;
    },
  },
};

export const THEME_OPTIONS: ThemeOption[] = [
  // Neutrals (White → Ivory → Cream → Sand → Charcoal)
  {
    id: "monochrome",
    label: "Gallery White",
    category: "quiet",
    tagline: "Crisp pure white with neutral obsidian ink",
    swatchLight: THEME_PALETTES.monochrome.light.background,
    swatchDark: THEME_PALETTES.monochrome.dark.background,
  },
  {
    id: "warm",
    label: "Warm Ivory",
    category: "quiet",
    tagline: "Classic warm book paper with espresso ink",
    swatchLight: THEME_PALETTES.warm.light.background,
    swatchDark: THEME_PALETTES.warm.dark.background,
  },
  {
    id: "cream",
    label: "Cream",
    category: "quiet",
    tagline: "Warm golden parchment with walnut umber",
    swatchLight: THEME_PALETTES.cream.light.background,
    swatchDark: THEME_PALETTES.cream.dark.background,
  },
  {
    id: "sand",
    label: "Sand",
    category: "quiet",
    tagline: "Tactile desert sand with warm chestnut",
    swatchLight: THEME_PALETTES.sand.light.background,
    swatchDark: THEME_PALETTES.sand.dark.background,
  },
  {
    id: "charcoal",
    label: "Charcoal",
    category: "quiet",
    tagline: "Neutral graphite and near-black depth",
    swatchLight: THEME_PALETTES.charcoal.light.background,
    swatchDark: THEME_PALETTES.charcoal.dark.background,
  },

  // Warm Spectrum (Butter → Peach → Apricot → Terracotta → Coral → Crimson)
  {
    id: "softYellow",
    label: "Butter",
    category: "expressive",
    tagline: "Luminous warm butter with bronze warmth",
    swatchLight: THEME_PALETTES.softYellow.light.background,
    swatchDark: THEME_PALETTES.softYellow.dark.background,
  },
  {
    id: "peach",
    label: "Peach",
    category: "expressive",
    tagline: "Soft pastel peach with warm terracotta",
    swatchLight: THEME_PALETTES.peach.light.background,
    swatchDark: THEME_PALETTES.peach.dark.background,
  },
  {
    id: "apricot",
    label: "Apricot",
    category: "expressive",
    tagline: "Warm sunlit apricot with amber tones",
    swatchLight: THEME_PALETTES.apricot.light.background,
    swatchDark: THEME_PALETTES.apricot.dark.background,
  },
  {
    id: "terracotta",
    label: "Terracotta",
    category: "expressive",
    tagline: "Sunbaked clay with warm earthy depth",
    swatchLight: THEME_PALETTES.terracotta.light.background,
    swatchDark: THEME_PALETTES.terracotta.dark.background,
  },
  {
    id: "coral",
    label: "Coral",
    category: "expressive",
    tagline: "Sunny coral with vivid warm contrast",
    swatchLight: THEME_PALETTES.coral.light.background,
    swatchDark: THEME_PALETTES.coral.dark.background,
  },
  {
    id: "crimson",
    label: "Crimson",
    category: "expressive",
    tagline: "Rich ruby crimson with soft rose contrast",
    swatchLight: THEME_PALETTES.crimson.light.background,
    swatchDark: THEME_PALETTES.crimson.dark.background,
  },

  // Pinks & Purples (Blush → Rose → Lavender → Violet → Plum)
  {
    id: "blush",
    label: "Blush",
    category: "expressive",
    tagline: "Delicate soft pink with ruby-plum ink",
    swatchLight: THEME_PALETTES.blush.light.background,
    swatchDark: THEME_PALETTES.blush.dark.background,
  },
  {
    id: "rose",
    label: "Rose",
    category: "expressive",
    tagline: "Muted romantic rose with berry depth",
    swatchLight: THEME_PALETTES.rose.light.background,
    swatchDark: THEME_PALETTES.rose.dark.background,
  },
  {
    id: "lavender",
    label: "Lavender",
    category: "expressive",
    tagline: "Soft evening lilac with imperial violet ink",
    swatchLight: THEME_PALETTES.lavender.light.background,
    swatchDark: THEME_PALETTES.lavender.dark.background,
  },
  {
    id: "indigo",
    label: "Violet",
    category: "expressive",
    tagline: "Deep royal violet with luminous iris glow",
    swatchLight: THEME_PALETTES.indigo.light.background,
    swatchDark: THEME_PALETTES.indigo.dark.background,
  },
  {
    id: "plum",
    label: "Plum",
    category: "expressive",
    tagline: "Deep velvet plum with soft orchid glow",
    swatchLight: THEME_PALETTES.plum.light.background,
    swatchDark: THEME_PALETTES.plum.dark.background,
  },

  // Cyans & Blues (Cyan → Sky → Denim → Navy)
  {
    id: "ocean",
    label: "Cyan",
    category: "expressive",
    tagline: "Pale icy aquamarine with deep ocean nuance",
    swatchLight: THEME_PALETTES.ocean.light.background,
    swatchDark: THEME_PALETTES.ocean.dark.background,
  },
  {
    id: "sky",
    label: "Sky",
    category: "quiet",
    tagline: "Clear morning sky with crisp sapphire ink",
    swatchLight: THEME_PALETTES.sky.light.background,
    swatchDark: THEME_PALETTES.sky.dark.background,
  },
  {
    id: "denim",
    label: "Denim",
    category: "expressive",
    tagline: "Muted indigo denim with clean contrast",
    swatchLight: THEME_PALETTES.denim.light.background,
    swatchDark: THEME_PALETTES.denim.dark.background,
  },
  {
    id: "midnight",
    label: "Navy",
    category: "expressive",
    tagline: "Deep celestial navy with sapphire glow",
    swatchLight: THEME_PALETTES.midnight.light.background,
    swatchDark: THEME_PALETTES.midnight.dark.background,
  },

  // Greens & Teals (Mint → Sage → Olive → Forest → Teal)
  {
    id: "mint",
    label: "Mint",
    category: "expressive",
    tagline: "Fresh pale mint with deep forest ink",
    swatchLight: THEME_PALETTES.mint.light.background,
    swatchDark: THEME_PALETTES.mint.dark.background,
  },
  {
    id: "sage",
    label: "Sage",
    category: "quiet",
    tagline: "Calm botanical sage with deep pine ink",
    swatchLight: THEME_PALETTES.sage.light.background,
    swatchDark: THEME_PALETTES.sage.dark.background,
  },
  {
    id: "moss",
    label: "Olive",
    category: "expressive",
    tagline: "Tactile earthy olive with organic depth",
    swatchLight: THEME_PALETTES.moss.light.background,
    swatchDark: THEME_PALETTES.moss.dark.background,
  },
  {
    id: "forest",
    label: "Forest",
    category: "expressive",
    tagline: "Deep evergreen pine with luminous mint glow",
    swatchLight: THEME_PALETTES.forest.light.background,
    swatchDark: THEME_PALETTES.forest.dark.background,
  },
  {
    id: "teal",
    label: "Teal",
    category: "expressive",
    tagline: "Deep ocean teal with luminous seafoam glow",
    swatchLight: THEME_PALETTES.teal.light.background,
    swatchDark: THEME_PALETTES.teal.dark.background,
  },
];

export const lightColors: ThemeColors = THEME_PALETTES.warm.light;
export const darkColors: ThemeColors = THEME_PALETTES.warm.dark;

export function getThemeColors(
  palette: ThemePaletteId = "warm",
  mode: "light" | "dark" = "light",
  accent: AccentChoice = "default"
): ThemeColors {
  const paletteGroup = THEME_PALETTES[palette] ?? THEME_PALETTES.warm;
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
