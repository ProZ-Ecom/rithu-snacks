import { Prisma } from "@/generated/prisma/client";

/** A resolved reporting window plus the equally long window immediately before it. */
export interface ReportRange {
  from: Date;
  to: Date;
  /** Same length as [from, to], ending the instant before `from`. */
  prevFrom: Date;
  prevTo: Date;
  /** Whole days in the window, used to pick the trend bucket. */
  days: number;
  /** What the caller asked for, echoed back so the UI can show it. */
  fromISO: string;
  toISO: string;
}

const DAY_MS = 86_400_000;

function startOfDay(value: string): Date | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value: string): Date | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // A bare YYYY-MM-DD means "through the end of that day".
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Every report reads the same two query params. Unparseable or inverted input
 * falls back to the last 30 days rather than erroring, so a stale bookmark
 * still renders something.
 */
export function resolveRange(filters: { dateFrom?: string; dateTo?: string }): ReportRange {
  const to = (filters.dateTo && endOfDay(filters.dateTo)) || endOfDay(new Date().toISOString().slice(0, 10))!;
  let from = (filters.dateFrom && startOfDay(filters.dateFrom)) || new Date(to.getTime() - 29 * DAY_MS);
  if (from > to) from = new Date(to.getTime() - 29 * DAY_MS);
  from.setUTCHours(0, 0, 0, 0);

  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);

  return {
    from,
    to,
    prevFrom,
    prevTo,
    days: Math.max(1, Math.floor(span / DAY_MS) + 1),
    fromISO: from.toISOString().slice(0, 10),
    toISO: to.toISOString().slice(0, 10),
  };
}

export const inRange = (r: { from: Date; to: Date }) => ({ gte: r.from, lte: r.to });

/** Decimal | number | null -> number, rounded to paise. */
export function num(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Percentage change, null when there is no base to compare against. */
export function change(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export const ratio = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/** Day buckets for ranges up to ~10 weeks, then weeks, then months. */
export type Bucket = "day" | "week" | "month";

export function pickBucket(days: number): Bucket {
  if (days <= 70) return "day";
  if (days <= 365) return "week";
  return "month";
}

/** The bucket key a timestamp belongs to, as a sortable string. */
export function bucketKey(date: Date, bucket: Bucket): string {
  const d = new Date(date);
  if (bucket === "month") return d.toISOString().slice(0, 7);
  if (bucket === "week") {
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/** Every bucket in the range, so a quiet day shows as zero instead of vanishing. */
export function bucketSeries(range: ReportRange, bucket: Bucket): string[] {
  const keys: string[] = [];
  const cursor = new Date(range.from);
  const seen = new Set<string>();
  while (cursor <= range.to) {
    const key = bucketKey(cursor, bucket);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

/**
 * MariaDB expression that collapses a timestamp column into its bucket key,
 * matching `bucketKey` exactly so server buckets and filled-in zero buckets agree.
 */
export function bucketSql(column: Prisma.Sql, bucket: Bucket): Prisma.Sql {
  if (bucket === "month") return Prisma.sql`DATE_FORMAT(${column}, '%Y-%m')`;
  if (bucket === "week") {
    return Prisma.sql`DATE_FORMAT(DATE(${column}) - INTERVAL WEEKDAY(${column}) DAY, '%Y-%m-%d')`;
  }
  return Prisma.sql`DATE_FORMAT(${column}, '%Y-%m-%d')`;
}

/** Turns raw `{ bucket, ... }` rows into a zero-filled series in range order. */
export function fillSeries<T extends { bucket: string }>(
  rows: T[],
  range: ReportRange,
  bucket: Bucket,
  empty: (key: string) => T
): T[] {
  const byKey = new Map(rows.map((r) => [r.bucket, r]));
  return bucketSeries(range, bucket).map((key) => byKey.get(key) ?? empty(key));
}

/** Orders that count as real business: active rows. */
export const ACTIVE_ORDER: Prisma.OrderWhereInput = { is_active: true };

/** Orders that count toward sales: excludes cancelled and returned. */
export const SOLD_ORDER: Prisma.OrderWhereInput = {
  is_active: true,
  order_status: { notIn: ["cancelled", "returned"] },
};
