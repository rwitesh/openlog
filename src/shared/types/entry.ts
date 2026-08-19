export interface EntryLocation {
  latitude: number;
  longitude: number;
  /** City or town, state, country — e.g. "Austin, Texas, United States". */
  name?: string;
}

export interface Entry {
  id: string;
  createdAt: number;
  updatedAt: number;
  text?: string;
  images: string[];
  audios: string[];
  location?: EntryLocation;
}

export interface NewEntryInput {
  text?: string;
  images?: string[];
  audios?: string[];
  createdAt?: number;
  location?: EntryLocation | null;
}

export interface UpdateEntryInput {
  text?: string;
  images?: string[];
  audios?: string[];
  createdAt?: number;
  location?: EntryLocation | null;
}

export interface EntrySearchResult {
  entry: Entry;
  /** Context around the first text match; empty when the entry has no text. Match ranges are wrapped in `\u0001 … \u0002` markers. */
  snippet: string;
  /** Context around a location-name match; empty when the entry has no location. Same marker convention. */
  locationSnippet: string;
}
