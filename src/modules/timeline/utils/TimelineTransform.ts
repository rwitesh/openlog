import type { Entry } from "@/shared/types";
import { formatMonthYear, startOfDay, startOfMonth } from "@/shared/utils/dates";
import type { TimelineItem } from "../types";

/** Newest-first timeline rows. Date circles appear on the first entry of each day. Month dividers appear at month transitions. */
export function toTimelineItems(entries: Entry[], showDates: boolean): TimelineItem[] {
  if (!entries.length) return [];

  const items: TimelineItem[] = [];
  let lastDay: number | null = null;
  let lastMonth: number | null = null;

  entries.forEach((entry, index) => {
    const dayTs = startOfDay(entry.createdAt);
    const monthTs = startOfMonth(entry.createdAt);
    const showDate = showDates && dayTs !== lastDay;
    const showMonth = showDates && (index === 0 || monthTs !== lastMonth);

    items.push({
      entry,
      dayTs,
      showDate,
      showMonth,
      monthLabel: showMonth ? formatMonthYear(monthTs) : undefined,
      isLast: index === entries.length - 1,
    });

    lastDay = dayTs;
    lastMonth = monthTs;
  });

  return items;
}
