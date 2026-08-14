/**
 * Typography built on Source Sans 3.
 *
 * 400 → entry text, 500 → metadata/labels, 600 → emphasis.
 * Each weight is loaded as its own family (see App.tsx) so the correct
 * glyphs render on every platform.
 */

export const FONT = {
  regular: "SourceSans3_400Regular",
  medium: "SourceSans3_500Medium",
  semibold: "SourceSans3_600SemiBold",
} as const;

export const FONT_SIZE = {
  xxs: 11,
  xs: 13,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  display: 30,
} as const;

/** Named text styles reused across the app. */
export const typography = {
  timestamp: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
  },
  entryText: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.lg,
    lineHeight: 28,
  },
  composerText: {
    fontFamily: FONT.regular,
    fontSize: FONT_SIZE.lg,
    lineHeight: 28,
  },
  caption: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  navTitle: {
    fontFamily: FONT.semibold,
    fontSize: FONT_SIZE.lg,
    lineHeight: 24,
  },
  settingLabel: {
    fontFamily: FONT.medium,
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
  },
} as const;
