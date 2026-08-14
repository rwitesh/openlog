import { getThemeColors, type ThemeColors } from "./colors";
import { space } from "./spacing";
import {
  BASE_FONT_SIZE,
  createTypography,
  FONT,
  type FontChoice,
  type TextSize,
  type TypographyStyles,
} from "./typography";
import { createMotion } from "./motion";
import type { ColorSchemeName } from "react-native";
import type { AppearancePreferences, AtmosphereIntensity } from "./preferences";
import type { ThemeMode } from "@/types/entry";
import type { MotionLevel } from "./motion";

export interface Theme {
  mode: "light" | "dark";
  colors: ThemeColors;
  font: typeof FONT;
  fontSize: typeof BASE_FONT_SIZE;
  fontChoice: FontChoice;
  textSize: TextSize;
  typography: TypographyStyles;
  spacing: typeof space;
  radius: typeof radius;
  motion: ReturnType<typeof createMotion>;
  atmosphere: AtmosphereIntensity;
}

/** Corner radius scale — cards, sheets, images. */
export const radius = { sm: 8, md: 12, lg: 20 } as const;

/** Resolves a stored preference mode against the current system appearance. */
export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: ColorSchemeName
): "light" | "dark" {
  if (mode === "system") return systemScheme === "dark" ? "dark" : "light";
  return mode;
}

/** Resolves complete visual tokens from user appearance and motion preferences. */
export function resolveTheme(
  appearance: AppearancePreferences,
  motionLevel: MotionLevel,
  systemScheme: ColorSchemeName
): Theme {
  const resolvedMode = resolveThemeMode(appearance.mode, systemScheme);

  return {
    mode: resolvedMode,
    colors: getThemeColors(appearance.palette, resolvedMode, appearance.accent),
    font: FONT,
    fontSize: BASE_FONT_SIZE,
    fontChoice: appearance.fontChoice,
    textSize: appearance.textSize,
    typography: createTypography(appearance.textSize, appearance.fontChoice),
    spacing: space,
    radius,
    motion: createMotion(motionLevel),
    atmosphere: appearance.atmosphere,
  };
}
