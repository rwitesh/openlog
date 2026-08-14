/** Small, allocation-light date helpers for the timeline. */

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

export function startOfMonth(ts: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(1);
  return d.getTime();
}

export function isSameMonth(a: number, b: number): boolean {
  return startOfMonth(a) === startOfMonth(b);
}

/** "Today", "Yesterday", or "Friday, August 14" — day label in the month feed. */
export function formatHeaderDate(ts: number, now = Date.now()): string {
  if (isSameDay(ts, now)) return "Today";

  const yesterday = addDays(now, -1);
  if (isSameDay(ts, yesterday)) return "Yesterday";

  const d = new Date(ts);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}

export function dayOfMonth(ts: number): number {
  return new Date(ts).getDate();
}

function formatClock(d: Date): string {
  const hours = d.getHours() % 12 || 12;
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${hours}:${minutes} ${ampm}`;
}

export function formatTime(ts: number): string {
  return formatClock(new Date(ts));
}

/** Full date and time for detail views. */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${formatClock(d)}`;
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

/** Entries in the given month, newest first. */
export function entriesForMonth<T extends { createdAt: number }>(
  entries: T[],
  monthTs: number
): T[] {
  const start = startOfMonth(monthTs);
  const end = addMonths(monthTs, 1);

  return entries
    .filter((entry) => entry.createdAt >= start && entry.createdAt < end)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function addMonths(ts: number, months: number): number {
  const d = new Date(startOfMonth(ts));
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

/** Month starts between two timestamps, oldest first. */
export function monthsBetween(aTs: number, bTs: number): number[] {
  const end = startOfMonth(Math.max(aTs, bTs));
  const months: number[] = [];
  let cursor = startOfMonth(Math.min(aTs, bTs));

  while (cursor <= end) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  return months;
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
