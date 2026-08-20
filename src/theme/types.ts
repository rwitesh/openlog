import type { Theme as NavigationTheme } from "@react-navigation/native";
import type { ColorSchemeName } from "react-native";

/* Color tokens */
export type {
  ThemeColors,
  AccentChoice,
  AccentOption,
  ThemeBackgroundConfig,
} from "./colors";

/* Typography tokens */
export type {
  FontName,
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
  TimelineStyle,
  TimelineDensity,
  EditorTextSize,
  ContrastLevel,
} from "./preferences";

/* Theme */

import type { ThemeColors, ThemeBackgroundConfig } from "./colors";
import type { TypographyStyles, FontName, TextSize } from "./typography";
import type { MotionTokens } from "./motion";
import type { SpacingScale } from "./spacing";
import type { UserPreferences } from "./preferences";

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
  /** User's chosen font family name. */
  readonly fontFamily: FontName;
  readonly textSize: TextSize;
  readonly typography: TypographyStyles;
  readonly spacing: SpacingScale;
  readonly radius: RadiusScale;
  readonly motion: MotionTokens;
  /** Optional background image treatment. */
  readonly backgroundConfig?: ThemeBackgroundConfig;
}

/** React Navigation theme, derived from resolved semantic tokens. */
export type NavTheme = NavigationTheme;

/* Context value contracts */

export interface PreferencesContextValue {
  readonly preferences: UserPreferences;
  setAppearance: (patch: Partial<import("./preferences").AppearancePreferences>) => void;
  setEntry: (patch: Partial<import("./preferences").EntryPreferences>) => void;
  setWriting: (patch: Partial<import("./preferences").WritingPreferences>) => void;
  setAccessibility: (patch: Partial<import("./preferences").AccessibilityPreferences>) => void;
  setSecurity: (patch: Partial<import("./preferences").SecurityPreferences>) => void;
  resetAppearanceDefaults: () => void;
}

/** @internal System scheme as reported by the OS. */
export type SystemScheme = ColorSchemeName;
