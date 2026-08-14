import type { Entry } from "@/types/entry";
import { addMonths, DAY_MS, dayOfMonth, getMonthEntries, isSameMonth, startOfDay, startOfMonth } from "./dates";
import { locationPlaceTitle } from "./location";

export interface MonthOverviewStats {
  monthTs: number;
  monthNameUpper: string;
  yearNumber: number;
  momentCount: number;
  photoCount: number;
  audioCount: number;
  places: string[];
}

export interface PulseDay {
  dayNumber: number;
  dayTs: number;
  momentCount: number;
  photoCount: number;
  audioCount: number;
  hasLocation: boolean;
  places: string[];
  heightFactor: number;
}

export interface MonthPulseData {
  daysInMonth: number;
  activeDaysCount: number;
  totalMoments: number;
  maxDayMoments: number;
  days: PulseDay[];
  startDayLabel: string;
  endDayLabel: string;
}

const MONTH_NAMES_UPPER = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

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
  const d = new Date(startOfMonth(monthTs));
  return {
    monthTs,
    monthNameUpper: MONTH_NAMES_UPPER[d.getMonth()],
    yearNumber: d.getFullYear(),
    momentCount: monthEntries.length,
    photoCount: getMonthPhotoCount(monthEntries),
    audioCount: getMonthAudioCount(monthEntries),
    places: getMonthLocations(monthEntries),
  };
}

/**
 * Computes continuous daily activity pulse / skyline across the month (01 .. 31).
 */
export function getMonthPulseData(entries: Entry[], monthTs: number): MonthPulseData {
  const monthEntries = getMonthEntries(entries, monthTs);
  const first = startOfMonth(monthTs);
  const d = new Date(first);
  const year = d.getFullYear();
  const month = d.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayMap = new Map<
    number,
    {
      momentCount: number;
      photoCount: number;
      audioCount: number;
      places: Set<string>;
    }
  >();

  for (const entry of monthEntries) {
    const day = dayOfMonth(entry.createdAt);
    const existing = dayMap.get(day) ?? {
      momentCount: 0,
      photoCount: 0,
      audioCount: 0,
      places: new Set<string>(),
    };

    existing.momentCount += 1;
    if (entry.type === "image" && entry.uris?.length) {
      existing.photoCount += entry.uris.length;
    }
    if (entry.type === "audio") {
      existing.audioCount += 1;
    }
    if (entry.location) {
      const title = locationPlaceTitle(entry.location);
      if (title && title !== "Location") {
        existing.places.add(title);
      }
    }

    dayMap.set(day, existing);
  }

  let maxDayMoments = 0;
  for (const info of dayMap.values()) {
    if (info.momentCount > maxDayMoments) {
      maxDayMoments = info.momentCount;
    }
  }

  const days: PulseDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayTs = first + (day - 1) * DAY_MS;
    const info = dayMap.get(day);
    const count = info?.momentCount ?? 0;

    let heightFactor = 0.1; // baseline tick for quiet day
    if (count > 0) {
      if (maxDayMoments <= 1) {
        heightFactor = 0.55;
      } else if (maxDayMoments === 2) {
        heightFactor = count === 1 ? 0.48 : 0.85;
      } else {
        // Sub-linear relative scaling to gracefully balance sparse and outlier days
        const normalized = Math.sqrt(count) / Math.sqrt(maxDayMoments);
        heightFactor = 0.28 + normalized * 0.72;
      }
    }

    days.push({
      dayNumber: day,
      dayTs,
      momentCount: count,
      photoCount: info?.photoCount ?? 0,
      audioCount: info?.audioCount ?? 0,
      hasLocation: Boolean(info && info.places.size > 0),
      places: info ? Array.from(info.places) : [],
      heightFactor,
    });
  }

  return {
    daysInMonth,
    activeDaysCount: dayMap.size,
    totalMoments: monthEntries.length,
    maxDayMoments,
    days,
    startDayLabel: "01",
    endDayLabel: String(daysInMonth).padStart(2, "0"),
  };
}
