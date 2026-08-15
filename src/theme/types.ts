/**
 * Consolidated type contracts for the theming & preferences system.
 *
 * Layout:
 *   types.ts             — contracts only (this file)
 *   resolver.ts          — pure token resolution (no React)
 *   PreferencesContext   — raw preference state + persistence
 *   ThemeContext         — resolved visual tokens (pure, derived)
 *
 * Token data (palettes, fonts, spacing constants) lives in its own
 * leaf modules; this file is the single import surface for types.
 */

import type { Theme as NavigationTheme } from "@react-navigation/native";
import type { ColorSchemeName } from "react-native";

/* Color tokens */
export type {
  ThemeColors,
  ThemePaletteId,
  AccentChoice,
  AccentOption,
  ThemeOption,
  ThemeBackgroundConfig,
} from "./colors";

/* Typography tokens */
export type {
  FontChoice,
  FontWeight,
  TextSize,
  TypographyStyles,
} from "./typography";

/* Motion tokens */
export type { MotionLevel, MotionTokens } from "./motion";

/* Spacing & layout tokens */
export type { SpacingScale, LayoutMetrics } from "./spacing";

/* Preference contracts */
export type ThemeMode = "system" | "light" | "dark";

export type {
  AppearancePreferences,
  EntryPreferences,
  WritingPreferences,
  AccessibilityPreferences,
  SecurityPreferences,
  UserPreferences,
  AtmosphereIntensity,
  TimelineStyle,
  TimelineDensity,
  EditorTextSize,
} from "./preferences";

/* Theme */

import type { ThemeColors, ThemeBackgroundConfig } from "./colors";
import type { TypographyStyles } from "./typography";
import type { MotionTokens } from "./motion";
import type { SpacingScale } from "./spacing";
import type {
  AccessibilityPreferences,
  AppearancePreferences,
  AtmosphereIntensity,
  EntryPreferences,
  SecurityPreferences,
  UserPreferences,
  WritingPreferences,
} from "./preferences";
import type { FontChoice, TextSize } from "./typography";

/** The mode after the user's preference has been reconciled with the OS. */
export type ResolvedThemeMode = "light" | "dark";

/** Corner radius scale — cards, sheets, images. */
export interface RadiusScale {
  readonly sm: 8;
  readonly md: 12;
  readonly lg: 20;
}

/**
 * Fully resolved visual tokens. Pure data — no preferences, no setters.
 * Identity is stable across renders unless a visual input changes.
 */
export interface Theme {
  /** Resolved mode ("light" | "dark") — never "system". */
  readonly mode: ResolvedThemeMode;
  readonly colors: ThemeColors;
  /** Raw font family tokens (sans family identifiers). */
  readonly font: Readonly<{
    regular: string;
    medium: string;
    semibold: string;
  }>;
  /** Base (unscaled) font size steps. */
  readonly fontSize: Readonly<Record<string, number>>;
  /** User's chosen font family and text scale (kept for introspection). */
  readonly fontChoice: FontChoice;
  readonly textSize: TextSize;
  readonly typography: TypographyStyles;
  readonly spacing: SpacingScale;
  readonly radius: RadiusScale;
  readonly motion: MotionTokens;
  readonly atmosphere: AtmosphereIntensity;
  /** Optional background image / visual overlay treatment. */
  readonly backgroundConfig?: ThemeBackgroundConfig;
}

/** React Navigation theme, derived from resolved semantic tokens. */
export type NavTheme = NavigationTheme;

/* Context value contracts */

export interface PreferencesContextValue {
  readonly preferences: UserPreferences;
  setAppearance: (patch: Partial<AppearancePreferences>) => void;
  setEntry: (patch: Partial<EntryPreferences>) => void;
  setWriting: (patch: Partial<WritingPreferences>) => void;
  setAccessibility: (patch: Partial<AccessibilityPreferences>) => void;
  setSecurity: (patch: Partial<SecurityPreferences>) => void;
  resetAppearanceDefaults: () => void;
}

/** @internal System scheme as reported by the OS. */
export type SystemScheme = ColorSchemeName;
