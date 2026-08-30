import { hasFont } from "@/services/fonts/catalog";
import type { AccentChoice, FontName, MotionLevel, TextSize } from "./tokens";
import { DEFAULT_FONT_FAMILY } from "./tokens";

export type ThemeMode = "system" | "light" | "dark";
export type TimelineStyle = "rail" | "minimal" | "clean";
export type TimelineDensity = "comfortable" | "compact";
export type EditorTextSize = "regular" | "large";

export interface AppearancePreferences {
  accent: AccentChoice;
  mode: ThemeMode;
  fontFamily: FontName;
  textSize: TextSize;
}

export interface EntryPreferences {
  timelineStyle: TimelineStyle;
  timelineDensity: TimelineDensity;
  showTimestamp: boolean;
  showLocation: boolean;
}

export interface WritingPreferences {
  editorTextSize: EditorTextSize;
}

export interface AccessibilityPreferences {
  motionLevel: MotionLevel;
}

export interface SecurityPreferences {
  biometricLock: boolean;
}

export interface UserPreferences {
  appearance: AppearancePreferences;
  entry: EntryPreferences;
  writing: WritingPreferences;
  accessibility: AccessibilityPreferences;
  security: SecurityPreferences;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  appearance: {
    accent: "default",
    mode: "system",
    fontFamily: DEFAULT_FONT_FAMILY,
    textSize: "regular",
  },
  entry: {
    timelineStyle: "rail",
    timelineDensity: "comfortable",
    showTimestamp: true,
    showLocation: true,
  },
  writing: {
    editorTextSize: "regular",
  },
  accessibility: {
    motionLevel: "subtle",
  },
  security: {
    biometricLock: false,
  },
};

// Database schema keys
export const THEME_KEY = "theme";
export const ACCENT_KEY = "accent_choice";
export const FONT_KEY = "font_choice";
export const TEXT_SIZE_KEY = "text_size";
export const TIMELINE_STYLE_KEY = "timeline_style";
export const TIMELINE_DENSITY_KEY = "timeline_density";
export const SHOW_LOCATION_KEY = "show_location_timeline";
export const SHOW_TIMESTAMP_KEY = "show_timestamp_timeline";
export const EDITOR_TEXT_SIZE_KEY = "editor_text_size";
export const MOTION_LEVEL_KEY = "motion_level";
export const BIOMETRIC_LOCK_KEY = "biometric_lock";
export const USER_NAME_KEY = "user_name";
export const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

// Field-to-DB key mappings
export const APPEARANCE_KEYS: Record<keyof AppearancePreferences, string> = {
  accent: ACCENT_KEY,
  mode: THEME_KEY,
  fontFamily: FONT_KEY,
  textSize: TEXT_SIZE_KEY,
};

export const ENTRY_KEYS: Record<keyof EntryPreferences, string> = {
  timelineStyle: TIMELINE_STYLE_KEY,
  timelineDensity: TIMELINE_DENSITY_KEY,
  showTimestamp: SHOW_TIMESTAMP_KEY,
  showLocation: SHOW_LOCATION_KEY,
};

export const WRITING_KEYS: Record<keyof WritingPreferences, string> = {
  editorTextSize: EDITOR_TEXT_SIZE_KEY,
};

export const ACCESSIBILITY_KEYS: Record<keyof AccessibilityPreferences, string> = {
  motionLevel: MOTION_LEVEL_KEY,
};

export const SECURITY_KEYS: Record<keyof SecurityPreferences, string> = {
  biometricLock: BIOMETRIC_LOCK_KEY,
};

export function toDbEntries<T extends object>(
  patch: Partial<T>,
  keyMap: Record<keyof T, string>
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const value = patch[key];
    if (value !== undefined) {
      entries[keyMap[key]] = value === null ? "null" : String(value);
    }
  }
  return entries;
}

export function parseUserPreferences(
  settings: Map<string, string> | Record<string, string>
): UserPreferences {
  const get = (key: string): string | undefined =>
    settings instanceof Map ? settings.get(key) : settings[key];

  const rawFont = get(FONT_KEY);
  let resolvedFont = DEFAULT_PREFERENCES.appearance.fontFamily;
  if (rawFont === "sans") {
    resolvedFont = "Source Sans 3";
  } else if (rawFont === "serif") {
    resolvedFont = "Source Serif 4";
  } else if (rawFont && hasFont(rawFont)) {
    // Unknown names (e.g. fonts removed from the catalog) fall back to default.
    resolvedFont = rawFont;
  }

  const appearance: AppearancePreferences = {
    accent: (get(ACCENT_KEY) as AccentChoice) || DEFAULT_PREFERENCES.appearance.accent,
    mode: (get(THEME_KEY) as ThemeMode) || DEFAULT_PREFERENCES.appearance.mode,
    fontFamily: resolvedFont,
    textSize: (get(TEXT_SIZE_KEY) as TextSize) || DEFAULT_PREFERENCES.appearance.textSize,
  };

  const entry: EntryPreferences = {
    timelineStyle:
      (get(TIMELINE_STYLE_KEY) as TimelineStyle) || DEFAULT_PREFERENCES.entry.timelineStyle,
    timelineDensity:
      (get(TIMELINE_DENSITY_KEY) as TimelineDensity) || DEFAULT_PREFERENCES.entry.timelineDensity,
    showTimestamp: get(SHOW_TIMESTAMP_KEY) !== "false",
    showLocation: get(SHOW_LOCATION_KEY) !== "false",
  };

  const writing: WritingPreferences = {
    editorTextSize:
      (get(EDITOR_TEXT_SIZE_KEY) as EditorTextSize) || DEFAULT_PREFERENCES.writing.editorTextSize,
  };

  const accessibility: AccessibilityPreferences = {
    motionLevel:
      (get(MOTION_LEVEL_KEY) as MotionLevel) || DEFAULT_PREFERENCES.accessibility.motionLevel,
  };

  const security: SecurityPreferences = {
    biometricLock: get(BIOMETRIC_LOCK_KEY) === "true",
  };

  return {
    appearance,
    entry,
    writing,
    accessibility,
    security,
  };
}

export function getAppearanceResetDbEntries(): Record<string, string> {
  return {
    [ACCENT_KEY]: DEFAULT_PREFERENCES.appearance.accent,
    [THEME_KEY]: DEFAULT_PREFERENCES.appearance.mode,
    [FONT_KEY]: DEFAULT_PREFERENCES.appearance.fontFamily,
    [TEXT_SIZE_KEY]: DEFAULT_PREFERENCES.appearance.textSize,
    [TIMELINE_STYLE_KEY]: DEFAULT_PREFERENCES.entry.timelineStyle,
    [TIMELINE_DENSITY_KEY]: DEFAULT_PREFERENCES.entry.timelineDensity,
    [SHOW_TIMESTAMP_KEY]: String(DEFAULT_PREFERENCES.entry.showTimestamp),
    [SHOW_LOCATION_KEY]: String(DEFAULT_PREFERENCES.entry.showLocation),
  };
}
