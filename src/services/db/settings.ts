import { runDb } from "./database";
import type { ThemeMode } from "@/theme/types";
import type { AccentChoice } from "@/theme/colors";
import type {
  AppearancePreferences,
  ContrastLevel,
  EditorTextSize,
  EntryPreferences,
  SecurityPreferences,
  TimelineDensity,
  TimelineStyle,
  UserPreferences,
  WritingPreferences,
  AccessibilityPreferences,
} from "@/theme/preferences";
import { DEFAULT_PREFERENCES } from "@/theme/preferences";
import type { TextSize } from "@/theme/typography";
import type { MotionLevel } from "@/theme/motion";
import { hasFont } from "@/services/fonts";

const THEME_KEY = "theme";
const ACCENT_KEY = "accent_choice";
const FONT_KEY = "font_choice";
const TEXT_SIZE_KEY = "text_size";
const BACKGROUND_IMAGE_KEY = "background_image_uri";
const BACKGROUND_IMAGE_OPACITY_KEY = "background_image_opacity";
const TIMELINE_STYLE_KEY = "timeline_style";
const TIMELINE_DENSITY_KEY = "timeline_density";
const SHOW_LOCATION_KEY = "show_location_timeline";
const SHOW_TIMESTAMP_KEY = "show_timestamp_timeline";
const EDITOR_TEXT_SIZE_KEY = "editor_text_size";
const MOTION_LEVEL_KEY = "motion_level";
const CONTRAST_KEY = "contrast";
const BIOMETRIC_LOCK_KEY = "biometric_lock";
const USER_NAME_KEY = "user_name";

export async function getSetting(key: string, fallback: string): Promise<string> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`,
      key
    );
    return row?.value ?? fallback;
  });
}

export async function setSetting(key: string, value: string): Promise<void> {
  await runDb(async (db) => {
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value
    );
  });
}

export async function setSettingsBatch(entries: Record<string, string>): Promise<void> {
  await runDb(async (db) => {
    for (const [key, value] of Object.entries(entries)) {
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        key,
        value
      );
    }
  });
}

export async function getAllUserPreferences(): Promise<{
  userName: string | null;
  preferences: UserPreferences;
}> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM settings`
    );
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.key, r.value);

    const userName = map.get(USER_NAME_KEY)?.trim() || null;

    const rawFont = map.get(FONT_KEY);
    let resolvedFont = DEFAULT_PREFERENCES.appearance.fontFamily;
    if (rawFont === "sans") {
      resolvedFont = "Source Sans 3";
    } else if (rawFont === "serif") {
      resolvedFont = "Source Serif 4";
    } else if (rawFont && hasFont(rawFont)) {
      resolvedFont = rawFont;
    }

    const rawOpacity = map.get(BACKGROUND_IMAGE_OPACITY_KEY);
    const parsedOpacity = rawOpacity ? parseFloat(rawOpacity) : NaN;
    const opacity = !isNaN(parsedOpacity)
      ? Math.min(Math.max(parsedOpacity, 0.05), 1.0)
      : (DEFAULT_PREFERENCES.appearance.backgroundImageOpacity ?? 0.35);

    const appearance: AppearancePreferences = {
      accent: (map.get(ACCENT_KEY) as AccentChoice) || DEFAULT_PREFERENCES.appearance.accent,
      mode: (map.get(THEME_KEY) as ThemeMode) || DEFAULT_PREFERENCES.appearance.mode,
      fontFamily: resolvedFont,
      textSize: (map.get(TEXT_SIZE_KEY) as TextSize) || DEFAULT_PREFERENCES.appearance.textSize,
      backgroundImageUri:
        map.get(BACKGROUND_IMAGE_KEY) && map.get(BACKGROUND_IMAGE_KEY) !== "null"
          ? map.get(BACKGROUND_IMAGE_KEY)
          : null,
      backgroundImageOpacity: opacity,
    };

    const entry: EntryPreferences = {
      timelineStyle:
        (map.get(TIMELINE_STYLE_KEY) as TimelineStyle) ||
        DEFAULT_PREFERENCES.entry.timelineStyle,
      timelineDensity:
        (map.get(TIMELINE_DENSITY_KEY) as TimelineDensity) ||
        DEFAULT_PREFERENCES.entry.timelineDensity,
      showTimestamp: map.get(SHOW_TIMESTAMP_KEY) !== "false",
      showLocation: map.get(SHOW_LOCATION_KEY) !== "false",
    };

    const writing: WritingPreferences = {
      editorTextSize:
        (map.get(EDITOR_TEXT_SIZE_KEY) as EditorTextSize) ||
        DEFAULT_PREFERENCES.writing.editorTextSize,
    };

    const accessibility: AccessibilityPreferences = {
      motionLevel:
        (map.get(MOTION_LEVEL_KEY) as MotionLevel) ||
        DEFAULT_PREFERENCES.accessibility.motionLevel,
      contrast:
        (map.get(CONTRAST_KEY) as ContrastLevel) ||
        DEFAULT_PREFERENCES.accessibility.contrast,
    };

    const security: SecurityPreferences = {
      biometricLock: map.get(BIOMETRIC_LOCK_KEY) === "true",
    };

    return {
      userName,
      preferences: {
        appearance,
        entry,
        writing,
        accessibility,
        security,
      },
    };
  });
}

export async function getUserName(): Promise<string | null> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`,
      USER_NAME_KEY
    );
    const value = row?.value?.trim();
    return value || null;
  });
}

export async function setUserName(name: string): Promise<void> {
  const trimmed = name.trim();
  await runDb(async (db) => {
    if (!trimmed) {
      await db.runAsync(`DELETE FROM settings WHERE key = ?`, USER_NAME_KEY);
      return;
    }

    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      USER_NAME_KEY,
      trimmed
    );
  });
}

export {
  THEME_KEY,
  ACCENT_KEY,
  FONT_KEY,
  TEXT_SIZE_KEY,
  TIMELINE_STYLE_KEY,
  TIMELINE_DENSITY_KEY,
  SHOW_LOCATION_KEY,
  SHOW_TIMESTAMP_KEY,
  EDITOR_TEXT_SIZE_KEY,
  MOTION_LEVEL_KEY,
  CONTRAST_KEY,
  BIOMETRIC_LOCK_KEY,
  BACKGROUND_IMAGE_KEY,
  BACKGROUND_IMAGE_OPACITY_KEY,
};
