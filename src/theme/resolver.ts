/**
 * Pure theme resolution — no React, no side effects.
 * Every function here is deterministic and safe to memoize on its inputs.
 */

import { getThemeColors } from "./colors";
import { createMotion } from "./motion";
import { space } from "./spacing";
import {
  BASE_FONT_SIZE,
  createTypography,
  DEFAULT_FONT_FAMILY,
  FONT,
} from "./typography";
import type {
  AppearancePreferences,
  MotionLevel,
  NavTheme,
  ResolvedThemeMode,
  SystemScheme,
  Theme,
  ThemeMode,
} from "./types";

/** Corner radius scale — cards, sheets, images. */
export const radius = { sm: 8, md: 12, lg: 20 } as const;

/** Resolves a stored preference mode against the current system appearance. */
export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: SystemScheme
): ResolvedThemeMode {
  if (mode === "system") return systemScheme === "dark" ? "dark" : "light";
  return mode;
}

/** Resolves complete visual tokens from appearance + motion preferences. */
export function resolveTheme(
  appearance: AppearancePreferences,
  motionLevel: MotionLevel,
  systemScheme: SystemScheme
): Theme {
  const mode = resolveThemeMode(appearance.mode, systemScheme);
  const activeFont = appearance.fontFamily || appearance.fontChoice || DEFAULT_FONT_FAMILY;

  return {
    mode,
    colors: getThemeColors(appearance.palette, mode, appearance.accent),
    font: FONT,
    fontSize: BASE_FONT_SIZE,
    fontFamily: activeFont,
    fontChoice: activeFont,
    textSize: appearance.textSize,
    typography: createTypography(appearance.textSize, activeFont),
    spacing: space,
    radius,
    motion: createMotion(motionLevel),
    atmosphere: appearance.atmosphere,
  };
}

/**
 * Derives the React Navigation theme directly from resolved semantic tokens.
 * Kept next to `resolveTheme` so navigation styling can never drift from
 * the design system.
 */
export function makeNavTheme(mode: ResolvedThemeMode, colors: Theme["colors"]): NavTheme {
  return {
    dark: mode === "dark",
    fonts: {
      regular: { fontFamily: FONT.regular, fontWeight: "400" },
      medium: { fontFamily: FONT.medium, fontWeight: "500" },
      bold: { fontFamily: FONT.semibold, fontWeight: "600" },
      heavy: { fontFamily: FONT.semibold, fontWeight: "600" },
    },
    colors: {
      primary: colors.text,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.separator,
      notification: colors.destructive,
    },
  };
}
