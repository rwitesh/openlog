import type { Entry } from "@/types/entry";

import { startOfDay } from "./dates";

export interface TimelineItem {
  entry: Entry;
  dayTs: number;
  showDate: boolean;
  isLast: boolean;
}

/** Newest-first timeline rows. Date circles appear on the first entry of each day. */
export function toTimelineItems(
  entries: Entry[],
  showDates: boolean
): TimelineItem[] {
  if (!entries.length) return [];

  const items: TimelineItem[] = [];
  let lastDay: number | null = null;

  entries.forEach((entry, index) => {
    const dayTs = startOfDay(entry.createdAt);
    const showDate = showDates && dayTs !== lastDay;

    items.push({
      entry,
      dayTs,
      showDate,
      isLast: index === entries.length - 1,
    });

    lastDay = dayTs;
  });

  return items;
}
