import type { PaginationMeta } from "@/lib/api/response";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parseLimit(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.trunc(raw)), MAX_LIMIT);
}

/** Cursor encodes the last-seen sort-field value(s) as opaque base64url JSON — never a raw offset. */
export function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCursor<T>(cursor: string | null): T | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch one page by over-fetching by 1: query `limit + 1` docs, and if the extra doc came
 * back, there's a next page. This avoids a separate count() query just to know `hasMore`.
 */
export function buildPagination(
  itemsFetched: number,
  limit: number,
  currentCursor: string | null,
  nextCursorValue: unknown
): PaginationMeta {
  const hasMore = itemsFetched > limit;
  return {
    cursor: currentCursor,
    nextCursor: hasMore ? encodeCursor(nextCursorValue) : null,
    hasMore,
    limit,
  };
}
