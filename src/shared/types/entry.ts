export interface EntryLocation {
  latitude: number;
  longitude: number;
  /** City or town, state, country — e.g. "Austin, Texas, United States". */
  name?: string;
}

/** A generic attached document (PDF, spreadsheet, video, anything) kept alongside an entry. */
export interface Attachment {
  /** Media reference: the stored filename on inputs, resolved to a live file URI on read. */
  uri: string;
  /** Original filename shown to the user, e.g. "Invoice.pdf". */
  name: string;
  mime?: string;
  size?: number;
}

export const TAG_COLOR_IDS = ["clay", "amber", "sage", "violet", "teal", "rose"] as const;
export type TagColorId = (typeof TAG_COLOR_IDS)[number];

export interface Tag {
  id: string;
  name: string;
  colorId: TagColorId;
}

export interface Entry {
  id: string;
  createdAt: number;
  updatedAt: number;
  text?: string;
  /** Live file URIs resolved from stored filenames; SQLite persists bare filenames only. */
  images: string[];
  audios: string[];
  attachments: Attachment[];
  tags: Tag[];
  location?: EntryLocation;
}

export interface NewEntryInput {
  text?: string;
  images?: string[];
  audios?: string[];
  attachments?: Attachment[];
  tagIds?: string[];
  createdAt?: number;
  location?: EntryLocation | null;
}

export interface UpdateEntryInput {
  text?: string;
  images?: string[];
  audios?: string[];
  attachments?: Attachment[];
  tagIds?: string[];
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
