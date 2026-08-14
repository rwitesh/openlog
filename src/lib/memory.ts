import type { Entry } from "@/types/entry";
import { addMonths, dayOfMonth, isSameMonth, startOfDay, startOfMonth } from "./dates";
import { locationPlaceTitle } from "./location";

export interface MonthOverviewStats {
  monthTs: number;
  momentCount: number;
  photoCount: number;
  audioCount: number;
  places: string[];
}

export interface DayGroup {
  dayTs: number;
  dayNumber: number;
  dayLabel: string;
  entries: Entry[];
}

/**
 * Filter and sort entries for a given month.
 * Default sort is newest-first (descending) within the month.
 */
export function getMonthEntries(
  entries: Entry[],
  monthTs: number,
  order: "desc" | "asc" = "desc"
): Entry[] {
  const start = startOfMonth(monthTs);
  const end = addMonths(monthTs, 1);

  return entries
    .filter((entry) => entry.createdAt >= start && entry.createdAt < end)
    .sort((a, b) => (order === "desc" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
}

/** Count total photos in a list of entries (sum of image uris). */
export function getMonthPhotoCount(entries: Entry[], monthTs?: number): number {
  const list = monthTs !== undefined ? getMonthEntries(entries, monthTs) : entries;
  return list.reduce((count, entry) => {
    if (entry.type === "image" && Array.isArray(entry.uris)) {
      return count + entry.uris.length;
    }
    return count;
  }, 0);
}

/** Count total audio recordings in a list of entries. */
export function getMonthAudioCount(entries: Entry[], monthTs?: number): number {
  const list = monthTs !== undefined ? getMonthEntries(entries, monthTs) : entries;
  return list.reduce((count, entry) => {
    return entry.type === "audio" ? count + 1 : count;
  }, 0);
}

/** Get unique place names across a list of entries. */
export function getMonthLocations(entries: Entry[], monthTs?: number): string[] {
  const list = monthTs !== undefined ? getMonthEntries(entries, monthTs) : entries;
  const placeSet = new Set<string>();

  for (const entry of list) {
    if (entry.location) {
      const title = locationPlaceTitle(entry.location);
      if (title && title !== "Location") {
        placeSet.add(title);
      }
    }
  }

  return Array.from(placeSet);
}

/** Aggregate overview stats for a month. */
export function getMonthOverview(entries: Entry[], monthTs: number): MonthOverviewStats {
  const monthEntries = getMonthEntries(entries, monthTs);
  return {
    monthTs,
    momentCount: monthEntries.length,
    photoCount: getMonthPhotoCount(monthEntries),
    audioCount: getMonthAudioCount(monthEntries),
    places: getMonthLocations(monthEntries),
  };
}

/** Group entries by calendar day (newest day first, entries within each day newest first). */
export function groupEntriesByDay(entries: Entry[]): DayGroup[] {
  if (!entries.length) return [];

  const groups: DayGroup[] = [];
  let currentDayTs: number | null = null;
  let currentGroup: DayGroup | null = null;

  for (const entry of entries) {
    const day = startOfDay(entry.createdAt);
    if (day !== currentDayTs) {
      currentDayTs = day;
      const dNum = dayOfMonth(day);
      currentGroup = {
        dayTs: day,
        dayNumber: dNum,
        dayLabel: String(dNum).padStart(2, "0"),
        entries: [entry],
      };
      groups.push(currentGroup);
    } else if (currentGroup) {
      currentGroup.entries.push(entry);
    }
  }

  return groups;
}

/** Find the previous and next months that contain entries. */
export function getAdjacentMonthsWithEntries(
  entries: Entry[],
  currentMonthTs: number
): { prevMonthTs: number | null; nextMonthTs: number | null } {
  const current = startOfMonth(currentMonthTs);
  const allMonths = Array.from(
    new Set(entries.map((e) => startOfMonth(e.createdAt)))
  ).sort((a, b) => a - b);

  let prevMonthTs: number | null = null;
  let nextMonthTs: number | null = null;

  for (const m of allMonths) {
    if (m < current) {
      prevMonthTs = m;
    } else if (m > current && nextMonthTs === null) {
      nextMonthTs = m;
      break;
    }
  }

  return { prevMonthTs, nextMonthTs };
}

/** Filter criteria for search/find compatibility. */
export interface MemorySearchFilter {
  query?: string;
  monthTs?: number;
  hasPhotos?: boolean;
  hasAudio?: boolean;
  locationQuery?: string;
}

/** Filter entries matching query or metadata. */
export function filterEntries(entries: Entry[], filter: MemorySearchFilter): Entry[] {
  return entries.filter((entry) => {
    if (filter.monthTs !== undefined && !isSameMonth(entry.createdAt, filter.monthTs)) {
      return false;
    }
    if (filter.hasPhotos && (entry.type !== "image" || !entry.uris.length)) {
      return false;
    }
    if (filter.hasAudio && entry.type !== "audio") {
      return false;
    }
    if (filter.locationQuery) {
      const loc = entry.location ? locationPlaceTitle(entry.location).toLowerCase() : "";
      if (!loc.includes(filter.locationQuery.toLowerCase())) {
        return false;
      }
    }
    if (filter.query) {
      const q = filter.query.toLowerCase();
      const text = entry.text?.toLowerCase() ?? "";
      const loc = entry.location?.name?.toLowerCase() ?? "";
      if (!text.includes(q) && !loc.includes(q)) {
        return false;
      }
    }
    return true;
  });
}
