import type { EntryLocation } from "@/shared/types";

/** Cap on photos attached to a single entry. */
export const MAX_IMAGES = 10;

export interface Draft {
  text?: string;
  images?: string[];
  audios?: string[];
  createdAt?: number;
  /** `null` clears an attached location when editing. */
  location?: EntryLocation | null;
}
