import { getDatabase } from "./database";
import type { ThemeMode } from "@/types/entry";

const THEME_KEY = "theme";

/** Reads the persisted theme preference, defaulting to "system". */
export async function getThemeMode(): Promise<ThemeMode> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    THEME_KEY
  );
  const value = row?.value;
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    THEME_KEY,
    mode
  );
}
