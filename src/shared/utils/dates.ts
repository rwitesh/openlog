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

/** "August 14" — date chip on the write screen. */
export function formatBadgeDate(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
}

/** "7:20 PM" — time chip on the write screen. */
export function formatBadgeTime(ts: number): string {
  return formatClock(new Date(ts));
}

/** Keep the clock from `timeTs` on the calendar day from `dayTs`. */
export function withTimeOfDay(dayTs: number, timeTs: number): number {
  const day = new Date(startOfDay(dayTs));
  const time = new Date(timeTs);
  day.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
  return day.getTime();
}

/** Set hour/minute on a calendar day (12-hour clock). */
export function withClock(
  dayTs: number,
  hour12: number,
  minute: number,
  pm: boolean
): number {
  const d = new Date(startOfDay(dayTs));
  let hour24 = hour12 % 12;
  if (hour12 === 12) hour24 = pm ? 12 : 0;
  else if (pm) hour24 += 12;
  d.setHours(hour24, minute, 0, 0);
  return d.getTime();
}

export function clockParts(ts: number): { hour: number; minute: number; pm: boolean } {
  const d = new Date(ts);
  const hour24 = d.getHours();
  return {
    hour: hour24 % 12 || 12,
    minute: d.getMinutes(),
    pm: hour24 >= 12,
  };
}

/** "Today · 7:20 PM" or "Friday, August 14 · 7:20 PM". */
export function formatWhen(ts: number, now = Date.now()): string {
  return `${formatHeaderDate(ts, now)} · ${formatTime(ts)}`;
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

/** Month offset from `from` to `to` (each normalized to start-of-month). */
export function monthOffset(from: number, to: number): number {
  const a = new Date(startOfMonth(from));
  const b = new Date(startOfMonth(to));
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
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

export function formatMonthName(ts: number): string {
  const d = new Date(ts);
  return MONTHS_LONG[d.getMonth()];
}

/** Canonical helper to retrieve all entries within a specific calendar month. */
export function getMonthEntries<T extends { createdAt: number }>(
  entries: T[],
  monthTs: number
): T[] {
  const start = startOfMonth(monthTs);
  const end = addMonths(monthTs, 1);
  return entries.filter((e) => e.createdAt >= start && e.createdAt < end);
}
