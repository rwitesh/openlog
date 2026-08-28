import { Easing } from "react-native";

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

export type AccentChoice =
  | "default"
  | "terracotta"
  | "amber"
  | "sage"
  | "rose"
  | "violet"
  | "teal"
  | "crimson"
  | "sky"
  | "coral"
  | "gold"
  | "neutral";

export interface AccentOption {
  id: AccentChoice;
  label: string;
  tagline: string;
  colorLight: string;
  colorDark: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  {
    id: "default",
    label: "Cobalt",
    tagline: "Signature electric ultramarine",
    colorLight: "#2D5BE3",
    colorDark: "#4D7DF9",
  },
  {
    id: "terracotta",
    label: "Terracotta",
    tagline: "Earthy baked Mediterranean clay",
    colorLight: "#BA4A32",
    colorDark: "#EC745C",
  },
  {
    id: "amber",
    label: "Amber Honey",
    tagline: "Warm golden sunset glow",
    colorLight: "#B87514",
    colorDark: "#F5A738",
  },
  {
    id: "sage",
    label: "Botanical Sage",
    tagline: "Calm evergreen morning mist",
    colorLight: "#38734C",
    colorDark: "#65B880",
  },
  {
    id: "rose",
    label: "Dusty Rose",
    tagline: "Intimate poetic berry",
    colorLight: "#B03A62",
    colorDark: "#F06E98",
  },
  {
    id: "violet",
    label: "Deep Violet",
    tagline: "Quiet meditative night sky",
    colorLight: "#6336B8",
    colorDark: "#A377FA",
  },
  {
    id: "teal",
    label: "Pacific Teal",
    tagline: "Deep ocean seafoam clarity",
    colorLight: "#147D75",
    colorDark: "#45C4B8",
  },
  {
    id: "crimson",
    label: "Crimson Ink",
    tagline: "Bold vermillion wax seal",
    colorLight: "#B82424",
    colorDark: "#F55F5F",
  },
  {
    id: "sky",
    label: "Morning Sky",
    tagline: "Clear alpine sapphire breeze",
    colorLight: "#0284C7",
    colorDark: "#38BDF8",
  },
  {
    id: "coral",
    label: "Sunlit Coral",
    tagline: "Warm luminous apricot",
    colorLight: "#C84E3C",
    colorDark: "#FB7C6D",
  },
  {
    id: "gold",
    label: "Imperial Gold",
    tagline: "Refined metallic shimmer",
    colorLight: "#A1760E",
    colorDark: "#EBB634",
  },
  {
    id: "neutral",
    label: "Graphite Slate",
    tagline: "Balanced architectural neutrality",
    colorLight: "#525866",
    colorDark: "#9CA3AF",
  },
];

export const DEFAULT_LIGHT_THEME: ThemeColors = {
  background: "#FAF7F2",
  surface: "#FFFFFF",
  surfaceMuted: "#F3EDE2",
  text: "#1B1816",
  textSecondary: "#686054",
  textTertiary: "#988E80",
  line: "#D8D0C2",
  marker: "#2D5BE3",
  accent: "#2D5BE3",
  destructive: "#D32F2F",
  success: "#2E7D4E",
  separator: "#E6DFC8",
};

export const DEFAULT_DARK_THEME: ThemeColors = {
  background: "#141312",
  surface: "#1C1A18",
  surfaceMuted: "#272421",
  text: "#F5F1EB",
  textSecondary: "#A49C90",
  textTertiary: "#6E675C",
  line: "#38332C",
  marker: "#4D7DF9",
  accent: "#4D7DF9",
  destructive: "#E57373",
  success: "#4CAF50",
  separator: "#2A2621",
};

export const lightColors: ThemeColors = DEFAULT_LIGHT_THEME;
export const darkColors: ThemeColors = DEFAULT_DARK_THEME;

export function getThemeColors(
  mode: "light" | "dark" = "light",
  accent: AccentChoice = "default"
): ThemeColors {
  const base = mode === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;

  const option = ACCENT_OPTIONS.find((opt) => opt.id === accent) ?? ACCENT_OPTIONS[0];
  const chosenColor = mode === "dark" ? option.colorDark : option.colorLight;

  return {
    ...base,
    accent: chosenColor,
    marker: chosenColor,
  };
}

export const FONT = {
  regular: "SourceSans3_400Regular",
  medium: "SourceSans3_500Medium",
  semibold: "SourceSans3_600SemiBold",
} as const;

export type FontWeight = keyof typeof FONT;
export type FontName = string;
export type TextSize = "compact" | "regular" | "generous";

export const DEFAULT_FONT_FAMILY: FontName = "Source Sans 3";

export function fontFamily(
  weight: FontWeight = "regular",
  fontName: FontName = DEFAULT_FONT_FAMILY
): string {
  if (fontName === "Source Sans 3") {
    return FONT[weight];
  }
  return fontName;
}

export const BASE_FONT_SIZE = {
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 14,
  lg: 15,
  xl: 17,
  display: 22,
} as const;

export const FONT_SIZE = BASE_FONT_SIZE;

export function scaleSize(base: number, size: TextSize): number {
  if (size === "compact") return Math.round(base * 0.9);
  if (size === "generous") return Math.round(base * 1.12);
  return base;
}

export function createTypography(
  size: TextSize = "regular",
  fontName: FontName = DEFAULT_FONT_FAMILY
) {
  const getF = (w: FontWeight = "regular") => fontFamily(w, fontName);
  const s = (base: number) => scaleSize(base, size);

  return {
    timestamp: {
      fontFamily: getF("medium"),
      fontSize: s(BASE_FONT_SIZE.xs),
      lineHeight: s(16),
      letterSpacing: 0.3,
    },
    entryText: {
      fontFamily: getF("regular"),
      fontSize: s(BASE_FONT_SIZE.lg),
      lineHeight: s(24),
      letterSpacing: 0.1,
    },
    composerText: {
      fontFamily: getF("regular"),
      fontSize: s(BASE_FONT_SIZE.xl),
      lineHeight: s(26),
      letterSpacing: 0.05,
    },
    caption: {
      fontFamily: getF("medium"),
      fontSize: s(BASE_FONT_SIZE.sm),
      lineHeight: s(18),
    },
    headerDate: {
      fontFamily: getF("semibold"),
      fontSize: s(BASE_FONT_SIZE.xl),
      lineHeight: s(24),
      letterSpacing: -0.2,
    },
    headerGreeting: {
      fontFamily: getF("semibold"),
      fontSize: s(28),
      lineHeight: s(34),
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontFamily: getF("regular"),
      fontSize: s(BASE_FONT_SIZE.xl),
      lineHeight: s(24),
      letterSpacing: 0.05,
    },
    headerMonth: {
      fontFamily: getF("semibold"),
      fontSize: s(BASE_FONT_SIZE.lg),
      lineHeight: s(20),
      letterSpacing: 0.1,
    },
    settingLabel: {
      fontFamily: getF("regular"),
      fontSize: s(BASE_FONT_SIZE.md),
      lineHeight: s(20),
    },
    emptyTitle: {
      fontFamily: getF("semibold"),
      fontSize: s(20),
      lineHeight: s(26),
      letterSpacing: -0.2,
    },
    emptyBody: {
      fontFamily: getF("regular"),
      fontSize: s(BASE_FONT_SIZE.lg),
      lineHeight: s(22),
    },
  } as const;
}

export const typography = createTypography("regular", DEFAULT_FONT_FAMILY);
export type TypographyStyles = ReturnType<typeof createTypography>;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type SpacingScale = typeof space;

export const sectionGap = space.lg;

export const metrics = {
  headerRowHeight: 48,
  fabSize: 56,
  iconXs: 14,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  btnSm: 28,
  btnMd: 36,
  btnLg: 44,
} as const;

export type LayoutMetrics = typeof metrics;

export interface RadiusScale {
  readonly sm: 8;
  readonly md: 12;
  readonly lg: 20;
}

export const radius = { sm: 8, md: 12, lg: 20 } as const;

export type MotionLevel = "full" | "subtle" | "reduced";

export const press = { opacity: 0.65 } as const;

export function createMotion(level: MotionLevel = "subtle") {
  if (level === "reduced") {
    return {
      level,
      fast: 0,
      normal: 0,
      slow: 0,
      spring: {
        damping: 100,
        stiffness: 1000,
        mass: 1,
      },
      easeOut: Easing.linear,
      easeInOut: Easing.linear,
    };
  }

  const multiplier = level === "full" ? 1.2 : 0.9;

  return {
    level,
    fast: Math.round(180 * multiplier),
    normal: Math.round(320 * multiplier),
    slow: Math.round(520 * multiplier),
    spring: {
      damping: level === "full" ? 14 : 20,
      stiffness: level === "full" ? 180 : 240,
      mass: 0.8,
    },
    easeOut: Easing.out(Easing.cubic),
    easeInOut: Easing.inOut(Easing.cubic),
  };
}

export const motion = createMotion("subtle");

export type MotionTokens = ReturnType<typeof createMotion>;
