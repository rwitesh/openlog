import {
  ACCENT_KEY,
  BACKGROUND_IMAGE_KEY,
  BACKGROUND_IMAGE_OPACITY_KEY,
  BIOMETRIC_LOCK_KEY,
  EDITOR_TEXT_SIZE_KEY,
  FONT_KEY,
  MOTION_LEVEL_KEY,
  parseUserPreferences,
  SHOW_LOCATION_KEY,
  SHOW_TIMESTAMP_KEY,
  TEXT_SIZE_KEY,
  THEME_KEY,
  TIMELINE_DENSITY_KEY,
  TIMELINE_STYLE_KEY,
  USER_NAME_KEY,
  type UserPreferences,
} from "@/theme/preferences";
import { runDb } from "./database";

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

export async function getAllSettingsMap(): Promise<Record<string, string>> {
  return runDb(async (db) => {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM settings`
    );
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
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
    const preferences = parseUserPreferences(map);

    return {
      userName,
      preferences,
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
  ACCENT_KEY,
  BACKGROUND_IMAGE_KEY,
  BACKGROUND_IMAGE_OPACITY_KEY,
  BIOMETRIC_LOCK_KEY,
  EDITOR_TEXT_SIZE_KEY,
  FONT_KEY,
  MOTION_LEVEL_KEY,
  SHOW_LOCATION_KEY,
  SHOW_TIMESTAMP_KEY,
  TEXT_SIZE_KEY,
  THEME_KEY,
  TIMELINE_DENSITY_KEY,
  TIMELINE_STYLE_KEY,
  USER_NAME_KEY,
};
