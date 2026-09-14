import { addDays, addMonths, startOfDay, startOfMonth } from "../../shared/utils/dates.ts";

export interface EntryCursor {
  createdAt: number;
  id: string;
}

export interface PagedEntriesOptions {
  cursor?: EntryCursor | number;
  monthTs?: number;
  dayTs?: number;
  limit?: number;
}

export interface PagedEntryQuery {
  query: string;
  params: (number | string)[];
  limit: number;
}

export function buildPagedEntryQuery(
  columns: string,
  options: PagedEntriesOptions = {}
): PagedEntryQuery {
  const { cursor, monthTs, dayTs, limit = 50 } = options;
  const conditions: string[] = [];
  const params: (number | string)[] = [];

  if (cursor !== undefined) {
    if (typeof cursor === "number") {
      conditions.push("created_at < ?");
      params.push(cursor);
    } else {
      conditions.push("(created_at, id) < (?, ?)");
      params.push(cursor.createdAt, cursor.id);
    }
  }

  if (dayTs !== undefined) {
    const start = startOfDay(dayTs);
    conditions.push("created_at >= ? AND created_at < ?");
    params.push(start, addDays(start, 1));
  } else if (monthTs !== undefined) {
    const start = startOfMonth(monthTs);
    conditions.push("created_at >= ? AND created_at < ?");
    params.push(start, addMonths(start, 1));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return {
    query: `
      SELECT ${columns}
        FROM entries
       ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT ?
    `,
    params,
    limit,
  };
}
