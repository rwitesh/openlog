import type { EntryLocation } from "@/shared/types";

export interface Draft {
  text?: string;
  imageUris?: string[];
  audioUri?: string;
  durationMs?: number;
  createdAt?: number;
  location?: EntryLocation;
}
