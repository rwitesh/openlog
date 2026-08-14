/**
 * Source Sans 3 — app-wide typeface.
 * 400 → body, 500 → metadata/labels, 600 → emphasis.
 */

export const FONT = {
  regular: "SourceSans3_400Regular",
  medium: "SourceSans3_500Medium",
  semibold: "SourceSans3_600SemiBold",
} as const;

export type FontWeight = keyof typeof FONT;

export function fontFamily(weight: FontWeight = "regular"): string {
  return FONT[weight];
}

export const FONT_SIZE = {
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 14,
  lg: 15,
  xl: 17,
  display: 22,
} as const;

/** Named text styles reused across the app. */
export const typography = {
  timestamp: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.xs,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  entryText: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.lg,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  composerText: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.xl,
    lineHeight: 26,
    letterSpacing: 0.05,
  },
  caption: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
  },
  headerDate: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.xl,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  headerGreeting: {
    fontFamily: FONT.semibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.xl,
    lineHeight: 24,
    letterSpacing: 0.05,
  },
  headerMonth: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.lg,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  settingLabel: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.md,
    lineHeight: 20,
  },
  emptyTitle: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.xl,
    lineHeight: 24,
  },
  emptyBody: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
} as const;
