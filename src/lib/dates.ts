/** Small, allocation-light date helpers for the timeline. */

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, days: number): number {
  return startOfDay(ts) + days * DAY_MS;
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** "Today", or "Fri 14" for the date strip. */
export function formatStripDay(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return "Today";

  const d = new Date(ts);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}`;
}

/** "Friday, August 14" — header title for the selected day. */
export function formatHeaderDate(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return "Today";

  const yesterday = addDays(now, -1);
  if (isSameDay(ts, yesterday)) return "Yesterday";

  const d = new Date(ts);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}

/** "10:42 AM" — time beside a timeline item. */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

/** Full date and time for detail views. */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const weekday = WEEKDAYS_LONG[d.getDay()];
  const month = MONTHS_LONG[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${weekday}, ${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
}

/** Entries that fall on the given calendar day, newest first. */
export function entriesForDay<T extends { createdAt: number }>(
  entries: T[],
  dayTs: number
): T[] {
  const start = startOfDay(dayTs);
  const end = start + DAY_MS;

  return entries
    .filter((entry) => entry.createdAt >= start && entry.createdAt < end)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Days to show in the horizontal strip (centered on the selected day). */
export function stripDays(centerTs: number, radius = 30): number[] {
  const center = startOfDay(centerTs);
  const days: number[] = [];

  for (let offset = -radius; offset <= radius; offset += 1) {
    days.push(center + offset * DAY_MS);
  }

  return days;
}

export function startOfMonth(ts: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(1);
  return d.getTime();
}

export function addMonths(ts: number, months: number): number {
  const d = new Date(startOfMonth(ts));
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

export function formatMonthYear(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** Month grid cells; null marks leading/trailing blanks. */
export function calendarCells(monthTs: number): (number | null)[] {
  const first = startOfMonth(monthTs);
  const firstWeekday = new Date(first).getDay();
  const daysInMonth = new Date(
    new Date(first).getFullYear(),
    new Date(first).getMonth() + 1,
    0
  ).getDate();

  const cells: (number | null)[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(first + (day - 1) * DAY_MS);
  }

  return cells;
}

/** Start-of-day timestamps for timeline entries in the given month. */
export function entryDaysInMonth(
  entries: { createdAt: number }[],
  monthTs: number
): Set<number> {
  const start = startOfMonth(monthTs);
  const end = addMonths(monthTs, 1);
  const days = new Set<number>();

  for (const entry of entries) {
    const day = startOfDay(entry.createdAt);
    if (day >= start && day < end) {
      days.add(day);
    }
  }

  return days;
}
