import type { Attachment, EntryLocation } from "@/shared/types";

/** Cap on photos attached to a single entry. */
export const MAX_IMAGES = 10;

/** Cap on generic documents (PDFs, videos, spreadsheets, …) attached to a single entry. */
export const MAX_ATTACHMENTS = 10;

export interface Draft {
  text?: string;
  images?: string[];
  audios?: string[];
  attachments?: Attachment[];
  createdAt?: number;
  /** `null` clears an attached location when editing. */
  location?: EntryLocation | null;
}
