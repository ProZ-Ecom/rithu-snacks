import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/prisma";
import {
  SOLD_ORDER,
  bucketSql,
  change,
  fillSeries,
  inRange,
  num,
  pickBucket,
  ratio,
  resolveRange,
  round2,
  type Bucket,
  type ReportRange,
} from "../lib/report-range";

export interface CustomersFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface CustomersTotals {
  signups: number;
  buyers: number;
  newBuyers: number;
  returningBuyers: number;
  repeatRate: number;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  avgOrdersPerBuyer: number;
  revenuePerBuyer: number;
}

export interface CustomersTrendPoint {
  bucket: string;
  signups: number;
  newBuyers: number;
  returningBuyers: number;
}

export interface TopCustomerRow {
  id: string;
  name: string;
  custId: string | null;
  phone: string | null;
  city: string | null;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
}

export interface GeoRow {
  key: string;
  label: string;
  customers: number;
  orders: number;
  revenue: number;
  share: number;
}

export interface AcquisitionRow {
  key: string;
  label: string;
  customers: number;
  orders: number;
  revenue: number;
  share: number;
}

export interface CustomersReport {
  range: { from: string; to: string; days: number; bucket: Bucket };
  totals: CustomersTotals;
  previous: CustomersTotals;
  changes: Record<keyof CustomersTotals, number | null>;
  trend: CustomersTrendPoint[];
  topCustomers: TopCustomerRow[];
  byState: GeoRow[];
  byCity: GeoRow[];
  acquisition: AcquisitionRow[];
  churnRisk: TopCustomerRow[];
}

const TOTAL_KEYS: (keyof CustomersTotals)[] = [
  "signups",
  "buyers",
  "newBuyers",
  "returningBuyers",
  "repeatRate",
  "orders",
  "revenue",
  "avgOrderValue",
  "avgOrdersPerBuyer",
  "revenuePerBuyer",
];

const DAY_MS = 86_400_000;
const TOP_LIMIT = 25;
const CHURN_DAYS = 90;

function soldWhere(window: { from: Date; to: Date }): Prisma.OrderWhereInput {
  return { ...SOLD_ORDER, createdAt: inRange(window) };
}

/**
 * A buyer is "new" when the window holds their first ever order.
 */
async function totalsFor(window: { from: Date; to: Date }): Promise<CustomersTotals> {
  const [signups, perCustomer] = await Promise.all([
    db.user.count({
      where: { deleted_at: null, role: { slug: "customer" }, createdAt: inRange(window) },
    }),
    db.order.groupBy({
      by: ["userId"],
      where: soldWhere(window),
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
  ]);

  const buyerIds = perCustomer.map((r) => r.userId);
  const firstOrders = buyerIds.length
    ? await db.order.groupBy({
        by: ["userId"],
        where: { ...SOLD_ORDER, userId: { in: buyerIds } },
        _min: { createdAt: true },
      })
    : [];
  const firstByUser = new Map(firstOrders.map((f) => [String(f.userId), f._min.createdAt]));

  let newBuyers = 0;
  for (const id of buyerIds) {
    const first = firstByUser.get(String(id));
    if (first && first >= window.from && first <= window.to) newBuyers += 1;
  }

  const buyers = perCustomer.length;
  const orders = perCustomer.reduce((s, r) => s + r._count._all, 0);
  const revenue = round2(perCustomer.reduce((s, r) => s + num(r._sum.totalAmount), 0));
  const returningBuyers = buyers - newBuyers;

  return {
    signups,
    buyers,
    newBuyers,
    returningBuyers,
    repeatRate: ratio(returningBuyers, buyers),
    orders,
    revenue,
    avgOrderValue: orders ? round2(revenue / orders) : 0,
    avgOrdersPerBuyer: buyers ? Math.round((orders / buyers) * 100) / 100 : 0,
    revenuePerBuyer: buyers ? round2(revenue / buyers) : 0,
  };
}

export const customersReportService = {
  async summary(filters: CustomersFilters): Promise<CustomersReport> {
    const range = resolveRange(filters);
    const bucket = pickBucket(range.days);

    const [totals, previous, trendRows, top, geo, acquisition, churn] = await Promise.all([
      totalsFor(range),
      totalsFor({ from: range.prevFrom, to: range.prevTo }),
      trend(range, bucket),
      topCustomers(range),
      geography(range),
      acquisitionSplit(range),
      churnRisk(),
    ]);

    const changes = Object.fromEntries(
      TOTAL_KEYS.map((k) => [k, change(totals[k], previous[k])])
    ) as Record<keyof CustomersTotals, number | null>;

    return {
      range: { from: range.fromISO, to: range.toISO, days: range.days, bucket },
      totals,
      previous,
      changes,
      trend: trendRows,
      topCustomers: top,
      byState: geo.states,
      byCity: geo.cities,
      acquisition,
      churnRisk: churn,
    };
  },
};

async function trend(range: ReportRange, bucket: Bucket): Promise<CustomersTrendPoint[]> {
  const signupKey = bucketSql(Prisma.sql`u.created_at`, bucket);
  const orderKey = bucketSql(Prisma.sql`o.created_at`, bucket);

  const [signupRows, buyerRows] = await Promise.all([
    db.$queryRaw<{ bucket: string; signups: bigint | number }[]>(Prisma.sql`
      SELECT ${signupKey} AS bucket, COUNT(*) AS signups
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL AND r.slug = 'customer'
        AND u.created_at BETWEEN ${range.from} AND ${range.to}
      GROUP BY bucket
      ORDER BY bucket
    `),
    db.$queryRaw<{ bucket: string; new_buyers: bigint | number; returning_buyers: bigint | number }[]>(Prisma.sql`
      SELECT ${orderKey} AS bucket,
             COUNT(DISTINCT CASE WHEN ${bucketSql(Prisma.sql`f.first_order`, bucket)} = ${orderKey} THEN o.user_id END) AS new_buyers,
             COUNT(DISTINCT CASE WHEN ${bucketSql(Prisma.sql`f.first_order`, bucket)} <> ${orderKey} THEN o.user_id END) AS returning_buyers
      FROM orders o
      JOIN (
        SELECT user_id, MIN(created_at) AS first_order
        FROM orders
        WHERE is_active = 1 AND order_status NOT IN ('cancelled', 'returned')
        GROUP BY user_id
      ) f ON f.user_id = o.user_id
      WHERE o.is_active = 1
        AND o.order_status NOT IN ('cancelled', 'returned')
        AND o.created_at BETWEEN ${range.from} AND ${range.to}
      GROUP BY bucket
      ORDER BY bucket
    `),
  ]);

  const signupsByBucket = new Map(signupRows.map((r) => [r.bucket, Number(r.signups)]));
  const buyersByBucket = new Map(
    buyerRows.map((r) => [r.bucket, { newBuyers: Number(r.new_buyers ?? 0), returningBuyers: Number(r.returning_buyers ?? 0) }])
  );

  const keys = new Set([...signupsByBucket.keys(), ...buyersByBucket.keys()]);
  const merged = [...keys].map((bucketKey) => ({
    bucket: bucketKey,
    signups: signupsByBucket.get(bucketKey) ?? 0,
    newBuyers: buyersByBucket.get(bucketKey)?.newBuyers ?? 0,
    returningBuyers: buyersByBucket.get(bucketKey)?.returningBuyers ?? 0,
  }));

  return fillSeries(merged, range, bucket, (b) => ({ bucket: b, signups: 0, newBuyers: 0, returningBuyers: 0 }));
}

async function hydrateCustomers(
  rows: { userId: bigint; orders: number; revenue: number; first: Date | null; last: Date | null }[]
): Promise<TopCustomerRow[]> {
  if (rows.length === 0) return [];
  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: {
      id: true,
      name: true,
      cust_id: true,
      phone: true,
      addresses: { where: { is_active: true }, select: { city: true }, take: 1 },
    },
  });
  const byId = new Map(users.map((u) => [String(u.id), u]));
  const now = Date.now();

  return rows.map((r) => {
    const u = byId.get(String(r.userId));
    return {
      id: String(r.userId),
      name: u?.name ?? `Customer #${r.userId}`,
      custId: u?.cust_id ?? null,
      phone: u?.phone ?? null,
      city: u?.addresses?.[0]?.city ?? null,
      orders: r.orders,
      revenue: r.revenue,
      avgOrderValue: r.orders ? round2(r.revenue / r.orders) : 0,
      firstOrderAt: r.first?.toISOString() ?? null,
      lastOrderAt: r.last?.toISOString() ?? null,
      daysSinceLastOrder: r.last ? Math.floor((now - r.last.getTime()) / DAY_MS) : null,
    };
  });
}

async function topCustomers(range: ReportRange): Promise<TopCustomerRow[]> {
  const rows = await db.order.groupBy({
    by: ["userId"],
    where: soldWhere(range),
    _count: { _all: true },
    _sum: { totalAmount: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: TOP_LIMIT,
  });

  return hydrateCustomers(
    rows.map((r) => ({
      userId: r.userId,
      orders: r._count._all,
      revenue: num(r._sum.totalAmount),
      first: r._min.createdAt ?? null,
      last: r._max.createdAt ?? null,
    }))
  );
}

/** Buyers with history but nothing recent - the follow-up list. */
async function churnRisk(): Promise<TopCustomerRow[]> {
  const rows = await db.order.groupBy({
    by: ["userId"],
    where: SOLD_ORDER,
    _count: { _all: true },
    _sum: { totalAmount: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  const cutoff = new Date(Date.now() - CHURN_DAYS * DAY_MS);
  const stale = rows
    .filter((r) => (r._max.createdAt ?? new Date(0)) < cutoff)
    .sort((a, b) => num(b._sum.totalAmount) - num(a._sum.totalAmount))
    .slice(0, TOP_LIMIT);

  return hydrateCustomers(
    stale.map((r) => ({
      userId: r.userId,
      orders: r._count._all,
      revenue: num(r._sum.totalAmount),
      first: r._min.createdAt ?? null,
      last: r._max.createdAt ?? null,
    }))
  );
}

/** State and city rollups come from the shipping address recorded on each order. */
async function geography(range: ReportRange): Promise<{ states: GeoRow[]; cities: GeoRow[] }> {
  const rows = await db.orderAddress.findMany({
    where: { is_active: true, type: "shipping", order: soldWhere(range) },
    select: { state: true, city: true, order: { select: { userId: true, totalAmount: true } } },
  });

  type Acc = { customers: Set<string>; orders: number; revenue: number };
  const states = new Map<string, Acc>();
  const cities = new Map<string, Acc>();

  const bump = (map: Map<string, Acc>, key: string, userId: string, value: number) => {
    const acc = map.get(key) ?? { customers: new Set<string>(), orders: 0, revenue: 0 };
    acc.customers.add(userId);
    acc.orders += 1;
    acc.revenue = round2(acc.revenue + value);
    map.set(key, acc);
  };

  let total = 0;
  for (const row of rows) {
    const value = num(row.order?.totalAmount);
    const userId = String(row.order?.userId ?? "");
    total = round2(total + value);
    bump(states, row.state || "Unknown", userId, value);
    bump(cities, `${row.city || "Unknown"}, ${row.state || "Unknown"}`, userId, value);
  }

  const flatten = (map: Map<string, Acc>, limit?: number) => {
    const list = [...map.entries()]
      .map(([key, v]) => ({
        key,
        label: key,
        customers: v.customers.size,
        orders: v.orders,
        revenue: v.revenue,
        share: ratio(v.revenue, total),
      }))
      .sort((a, b) => b.revenue - a.revenue);
    return limit ? list.slice(0, limit) : list;
  };

  return { states: flatten(states), cities: flatten(cities, 15) };
}

/** Order cohort analysis (first-time vs repeat cohorts). */
async function acquisitionSplit(range: ReportRange): Promise<AcquisitionRow[]> {
  const userOrderStats = await db.order.groupBy({
    by: ["userId"],
    where: soldWhere(range),
    _count: { _all: true },
    _sum: { totalAmount: true },
  });

  const cohorts: Record<string, { label: string; customers: number; orders: number; revenue: number }> = {
    "1": { label: "1 order (First-time buyers)", customers: 0, orders: 0, revenue: 0 },
    "2-3": { label: "2 – 3 orders (Repeat buyers)", customers: 0, orders: 0, revenue: 0 },
    "4-5": { label: "4 – 5 orders (Frequent buyers)", customers: 0, orders: 0, revenue: 0 },
    "6+": { label: "6+ orders (Loyal snackers)", customers: 0, orders: 0, revenue: 0 },
  };

  let totalRevenue = 0;

  for (const u of userOrderStats) {
    const count = u._count._all;
    const rev = num(u._sum.totalAmount);
    totalRevenue = round2(totalRevenue + rev);

    let bucketKey = "1";
    if (count >= 6) bucketKey = "6+";
    else if (count >= 4) bucketKey = "4-5";
    else if (count >= 2) bucketKey = "2-3";

    cohorts[bucketKey].customers += 1;
    cohorts[bucketKey].orders += count;
    cohorts[bucketKey].revenue = round2(cohorts[bucketKey].revenue + rev);
  }

  return Object.entries(cohorts).map(([key, c]) => ({
    key,
    label: c.label,
    customers: c.customers,
    orders: c.orders,
    revenue: c.revenue,
    share: ratio(c.revenue, totalRevenue),
  }));
}
