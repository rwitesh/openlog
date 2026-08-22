import { Easing, type ImageSourcePropType } from "react-native";

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
  readonly imageSource?: ImageSourcePropType | null;
  readonly opacity?: number;
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
  {
    id: "default",
    label: "Default",
    tagline: "Systematic graphite ink",
    colorLight: "#6B665C",
    colorDark: "#CDC8BE",
  },
  {
    id: "terracotta",
    label: "Terracotta",
    tagline: "Earthy baked clay",
    colorLight: "#A24E38",
    colorDark: "#DC7A64",
  },
  {
    id: "amber",
    label: "Amber",
    tagline: "Warm golden honey",
    colorLight: "#B47318",
    colorDark: "#E69F38",
  },
  {
    id: "sage",
    label: "Sage",
    tagline: "Calm botanical pine",
    colorLight: "#446E52",
    colorDark: "#76A886",
  },
  {
    id: "denim",
    label: "Denim",
    tagline: "Classic indigo wash",
    colorLight: "#335C8D",
    colorDark: "#6D9ECC",
  },
  {
    id: "crimson",
    label: "Crimson",
    tagline: "Deep vermillion red",
    colorLight: "#B3261E",
    colorDark: "#F26C68",
  },
  {
    id: "rose",
    label: "Rose",
    tagline: "Muted dusty berry",
    colorLight: "#A63D5C",
    colorDark: "#DD6F8E",
  },
  {
    id: "violet",
    label: "Violet",
    tagline: "Quiet meditative purple",
    colorLight: "#5B32A8",
    colorDark: "#9C6EF5",
  },
  {
    id: "teal",
    label: "Teal",
    tagline: "Deep ocean seafoam",
    colorLight: "#19786A",
    colorDark: "#4CBAA8",
  },
  {
    id: "forest",
    label: "Forest",
    tagline: "Rich evergreen foliage",
    colorLight: "#1B5E20",
    colorDark: "#43A047",
  },
  {
    id: "sky",
    label: "Sky",
    tagline: "Morning sapphire air",
    colorLight: "#0288D1",
    colorDark: "#4FC3F7",
  },
  {
    id: "coral",
    label: "Coral",
    tagline: "Warm sunlit apricot",
    colorLight: "#C04B40",
    colorDark: "#EA796F",
  },
  {
    id: "plum",
    label: "Plum",
    tagline: "Velvet dark orchid",
    colorLight: "#7E3576",
    colorDark: "#C76BC0",
  },
  {
    id: "neutral",
    label: "Slate",
    tagline: "Balanced neutral slate",
    colorLight: "#64748B",
    colorDark: "#94A3B8",
  },
  {
    id: "gold",
    label: "Gold",
    tagline: "Refined metallic amber",
    colorLight: "#A17A10",
    colorDark: "#E0B538",
  },
  {
    id: "cyan",
    label: "Cyan",
    tagline: "Vibrant icy aquamarine",
    colorLight: "#157A8C",
    colorDark: "#4EC0D6",
  },
];

export const DEFAULT_LIGHT_THEME: ThemeColors = {
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

export const DEFAULT_DARK_THEME: ThemeColors = {
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

export const lightColors: ThemeColors = DEFAULT_LIGHT_THEME;
export const darkColors: ThemeColors = DEFAULT_DARK_THEME;

export function getThemeColors(
  mode: "light" | "dark" = "light",
  accent: AccentChoice = "default"
): ThemeColors {
  const base = mode === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;

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

export function timelineContentInset(headerHeight: number): number {
  return headerHeight + sectionGap;
}

export const metrics = {
  headerRowHeight: 48,
  fabSize: 48,
  iconXs: 14,
  iconSm: 16,
  iconMd: 20,
  btnSm: 28,
  btnMd: 36,
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
