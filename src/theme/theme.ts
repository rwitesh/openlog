import { darkColors, lightColors, type ThemeColors } from "./colors";
import { space } from "./spacing";
import { FONT, FONT_SIZE, typography } from "./typography";
import type { ColorSchemeName } from "react-native";
import type { ThemeMode } from "@/types/entry";

export interface Theme {
  mode: "light" | "dark";
  colors: ThemeColors;
  font: typeof FONT;
  fontSize: typeof FONT_SIZE;
  typography: typeof typography;
  spacing: typeof space;
  radius: typeof radius;
}

/** Corner radius scale — cards, sheets, images. */
export const radius = { sm: 8, md: 12, lg: 20 } as const;

const base = {
  font: FONT,
  fontSize: FONT_SIZE,
  typography,
  spacing: space,
  radius,
};

export const lightTheme: Theme = { ...base, mode: "light", colors: lightColors };
export const darkTheme: Theme = { ...base, mode: "dark", colors: darkColors };

export function themeFor(mode: "light" | "dark"): Theme {
  return mode === "dark" ? darkTheme : lightTheme;
}

/** Resolves a stored preference against the current system appearance. */
export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: ColorSchemeName
): "light" | "dark" {
  if (mode === "system") return systemScheme === "dark" ? "dark" : "light";
  return mode;
}
