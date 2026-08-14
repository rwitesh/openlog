import { Platform } from "react-native";

export const FONT = {
  regular: "SourceSans3_400Regular",
  medium: "SourceSans3_500Medium",
  semibold: "SourceSans3_600SemiBold",
} as const;

export type FontWeight = keyof typeof FONT;
export type FontChoice = "sans" | "serif";
export type TextSize = "compact" | "regular" | "generous";

export function fontFamily(weight: FontWeight = "regular", fontChoice: FontChoice = "sans"): string {
  if (fontChoice === "serif") {
    return Platform.OS === "ios" ? "Georgia" : "serif";
  }
  return FONT[weight];
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

export function scaleSize(base: number, size: TextSize): number {
  if (size === "compact") return Math.round(base * 0.9);
  if (size === "generous") return Math.round(base * 1.12);
  return base;
}

export function createTypography(size: TextSize = "regular", fontChoice: FontChoice = "sans") {
  const getF = (w: FontWeight = "regular") => fontFamily(w, fontChoice);
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
      fontFamily: getF("medium"),
      fontSize: s(BASE_FONT_SIZE.xl),
      lineHeight: s(24),
    },
    emptyBody: {
      fontFamily: getF("regular"),
      fontSize: s(BASE_FONT_SIZE.sm),
      lineHeight: s(20),
    },
  } as const;
}

export const FONT_SIZE = BASE_FONT_SIZE;
export const typography = createTypography("regular", "sans");
export type TypographyStyles = ReturnType<typeof createTypography>;
