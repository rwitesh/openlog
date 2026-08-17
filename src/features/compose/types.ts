import type { EntryLocation } from "@/shared/types";

export interface Draft {
  text?: string;
  images?: string[];
  audios?: string[];
  createdAt?: number;
  location?: EntryLocation;
}
