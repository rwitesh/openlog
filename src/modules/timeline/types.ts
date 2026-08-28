import type { Entry } from "@/shared/types";

export interface TimelineItem {
  entry: Entry;
  dayTs: number;
  showDate: boolean;
  showMonth: boolean;
  monthLabel?: string;
  isLast: boolean;
}
