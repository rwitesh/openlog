import { runDb } from "./database";
import type { ThemeMode } from "@/types/entry";

const THEME_KEY = "theme";
const USER_NAME_KEY = "user_name";

/** Reads the persisted theme preference, defaulting to "system". */
export async function getThemeMode(): Promise<ThemeMode> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`,
      THEME_KEY
    );
    const value = row?.value;
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return "system";
  });
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await runDb(async (db) => {
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      THEME_KEY,
      mode
    );
  });
}

/** Reads the persisted display name, or null if unset. */
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
