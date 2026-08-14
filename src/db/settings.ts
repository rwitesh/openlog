import { runDb } from "./database";
import type { ThemeMode } from "@/types/entry";

const THEME_KEY = "theme";
const AUTO_LOCATION_KEY = "auto_location";

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

export async function getAutoLocation(): Promise<boolean> {
  return runDb(async (db) => {
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`,
      AUTO_LOCATION_KEY
    );
    return row?.value === "true";
  });
}

export async function setAutoLocation(enabled: boolean): Promise<void> {
  await runDb(async (db) => {
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      AUTO_LOCATION_KEY,
      enabled ? "true" : "false"
    );
  });
}
