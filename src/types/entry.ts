export type EntryType = "text" | "image" | "audio";

export interface EntryLocation {
  latitude: number;
  longitude: number;
  /** City or town, state, country — e.g. "Austin, Texas, United States". */
  name?: string;
}

interface EntryBase {
  id: string;
  createdAt: number;
  updatedAt: number;
  location?: EntryLocation;
}

export type TextEntry = EntryBase & {
  type: "text";
  text: string;
};

export type ImageEntry = EntryBase & {
  type: "image";
  text?: string;
  uris: string[];
};

export type AudioEntry = EntryBase & {
  type: "audio";
  text?: string;
  uri: string;
  durationMs?: number;
};

export type Entry = TextEntry | ImageEntry | AudioEntry;

export type NewEntryInput = (
  | { type: "text"; text: string }
  | { type: "image"; text?: string; uris: string[] }
  | { type: "audio"; text?: string; uri: string; durationMs?: number }
) & { createdAt?: number; location?: EntryLocation };

export type ThemeMode = "system" | "light" | "dark";
