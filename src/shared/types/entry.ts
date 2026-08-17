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
