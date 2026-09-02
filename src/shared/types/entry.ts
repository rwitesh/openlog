export interface EntryLocation {
  latitude: number;
  longitude: number;
  /** City or town, state, country — e.g. "Austin, Texas, United States". */
  name?: string;
}

/** A generic attached document (PDF, spreadsheet, video, anything) kept alongside an entry. */
export interface Attachment {
  /** Durable file URI inside the app's media directory. */
  uri: string;
  /** Original filename shown to the user, e.g. "Invoice.pdf". */
  name: string;
  mime?: string;
  size?: number;
}

export interface Entry {
  id: string;
  createdAt: number;
  updatedAt: number;
  text?: string;
  images: string[];
  audios: string[];
  attachments: Attachment[];
  location?: EntryLocation;
}

export interface NewEntryInput {
  text?: string;
  images?: string[];
  audios?: string[];
  attachments?: Attachment[];
  createdAt?: number;
  location?: EntryLocation | null;
}

export interface UpdateEntryInput {
  text?: string;
  images?: string[];
  audios?: string[];
  attachments?: Attachment[];
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
