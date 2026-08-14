export type EntryType = "text" | "image" | "audio";

export interface Entry {
  id: string;
  type: EntryType;
  createdAt: number;
  text?: string;
  uri?: string;
  /** Audio length in milliseconds. */
  durationMs?: number;
}

export type ThemeMode = "system" | "light" | "dark";
