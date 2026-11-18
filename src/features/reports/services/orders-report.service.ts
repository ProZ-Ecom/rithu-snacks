import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/prisma";
import {
  ACTIVE_ORDER,
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
import {
  IN_PROGRESS_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_ORDER,
  PAYMENT_STATUS_LABELS,
} from "../lib/report-labels";

const DAY_MS = 86_400_000;

export interface OrdersFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentStatus?: string;
}

export interface OrdersTotals {
  orders: number;
  value: number;
  delivered: number;
  deliveredValue: number;
  inProgress: number;
  cancelled: number;
  cancelledValue: number;
  returned: number;
  cancelRate: number;
  returnRate: number;
  fulfilmentRate: number;
  avgDeliveryDays: number | null;
}

export interface StatusRow {
  status: string;
  label: string;
  orders: number;
  value: number;
  share: number;
}

export interface ReasonRow {
  reason: string;
  by: string;
  orders: number;
  value: number;
}

export interface OrdersTrendPoint {
  bucket: string;
  placed: number;
  delivered: number;
  cancelled: number;
}

export interface OrderListRow {
  id: string;
  orderNumber: string;
  placedAt: string | null;
  customer: string;
  status: string;
  paymentStatus: string;
  items: number;
  value: number;
  deliveredAt: string | null;
  deliveryDays: number | null;
}

export interface OrdersReport {
  range: { from: string; to: string; days: number; bucket: Bucket };
  totals: OrdersTotals;
  previous: OrdersTotals;
  changes: Record<keyof OrdersTotals, number | null>;
  byStatus: StatusRow[];
  byPaymentStatus: StatusRow[];
  cancellationReasons: ReasonRow[];
  returnReasons: ReasonRow[];
  trend: OrdersTrendPoint[];
  orders: OrderListRow[];
  ordersTruncated: boolean;
}

const TOTAL_KEYS: (keyof OrdersTotals)[] = [
  "orders",
  "value",
  "delivered",
  "deliveredValue",
  "inProgress",
  "cancelled",
  "cancelledValue",
  "returned",
  "cancelRate",
  "returnRate",
  "fulfilmentRate",
  "avgDeliveryDays",
];

/** Orders report counts every order, cancelled ones included - that is the point of it. */
function orderWhere(filters: OrdersFilters, window: { from: Date; to: Date }): Prisma.OrderWhereInput {
  return {
    ...ACTIVE_ORDER,
    createdAt: inRange(window),
    ...(filters.status ? { order_status: filters.status as Prisma.OrderWhereInput["order_status"] } : {}),
    ...(filters.paymentStatus
      ? { payment_status: filters.paymentStatus as Prisma.OrderWhereInput["payment_status"] }
      : {}),
  };
}

function statusRows(
  rows: { key: string; orders: number; value: number }[],
  labels: Record<string, string>,
  order: string[],
  totalOrders: number
): StatusRow[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const known = order.filter((k) => byKey.has(k)).map((k) => byKey.get(k)!);
  const extra = rows.filter((r) => !order.includes(r.key));
  return [...known, ...extra].map((r) => ({
    status: r.key,
    label: labels[r.key] ?? r.key,
    orders: r.orders,
    value: r.value,
    share: ratio(r.orders, totalOrders),
  }));
}

async function totalsFor(
  where: Prisma.OrderWhereInput
): Promise<{ totals: OrdersTotals; statusGroups: { key: string; orders: number; value: number }[] }> {
  const [groups, deliveredOrders] = await Promise.all([
    db.order.groupBy({
      by: ["order_status"],
      where,
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    db.order.findMany({
      where: { ...where, order_status: "delivered" },
      select: {
        id: true,
        placed_at: true,
        createdAt: true,
        updatedAt: true,
        order_status_history: {
          where: { status: "delivered" },
          orderBy: { created_at: "desc" },
          take: 1,
          select: { created_at: true },
        },
      },
    }),
  ]);

  const gaps = deliveredOrders
    .map((o) => {
      const start = o.placed_at ?? o.createdAt;
      const deliveredTime = o.order_status_history[0]?.created_at ?? o.updatedAt;
      return start && deliveredTime ? (deliveredTime.getTime() - start.getTime()) / DAY_MS : null;
    })
    .filter((d): d is number => d != null && d >= 0);
  const avgDays = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;

  const statusGroups = groups.map((g) => ({
    key: String(g.order_status),
    orders: g._count._all,
    value: num(g._sum.totalAmount),
  }));

  const pick = (keys: readonly string[]) =>
    statusGroups
      .filter((g) => keys.includes(g.key))
      .reduce(
        (acc, g) => ({ orders: acc.orders + g.orders, value: round2(acc.value + g.value) }),
        { orders: 0, value: 0 }
      );

  const all = pick(ORDER_STATUS_ORDER);
  const delivered = pick(["delivered"]);
  const cancelled = pick(["cancelled"]);
  const returned = pick(["returned"]);
  const inProgress = pick(IN_PROGRESS_STATUSES);

  return {
    totals: {
      orders: all.orders,
      value: all.value,
      delivered: delivered.orders,
      deliveredValue: delivered.value,
      inProgress: inProgress.orders,
      cancelled: cancelled.orders,
      cancelledValue: cancelled.value,
      returned: returned.orders,
      cancelRate: ratio(cancelled.orders, all.orders),
      returnRate: ratio(returned.orders, all.orders),
      fulfilmentRate: ratio(delivered.orders, all.orders),
      avgDeliveryDays: avgDays == null ? null : Math.round(avgDays * 10) / 10,
    },
    statusGroups,
  };
}

const ORDER_LIST_LIMIT = 500;

export const ordersReportService = {
  async summary(filters: OrdersFilters): Promise<OrdersReport> {
    const range = resolveRange(filters);
    const bucket = pickBucket(range.days);

    const where = orderWhere(filters, range);
    const prevWhere = orderWhere(filters, { from: range.prevFrom, to: range.prevTo });

    const [current, previous, paymentGroups, cancellation, returns, trendRows, list] = await Promise.all([
      totalsFor(where),
      totalsFor(prevWhere),
      db.order.groupBy({
        by: ["payment_status"],
        where,
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      cancellationReasons(where),
      returnReasons(range),
      trend(range, bucket, filters),
      orderList(where),
    ]);

    const changes = Object.fromEntries(
      TOTAL_KEYS.map((k) => [k, change(Number(current.totals[k] ?? 0), Number(previous.totals[k] ?? 0))])
    ) as Record<keyof OrdersTotals, number | null>;

    return {
      range: { from: range.fromISO, to: range.toISO, days: range.days, bucket },
      totals: current.totals,
      previous: previous.totals,
      changes,
      byStatus: statusRows(current.statusGroups, ORDER_STATUS_LABELS, ORDER_STATUS_ORDER, current.totals.orders),
      byPaymentStatus: statusRows(
        paymentGroups.map((g) => ({
          key: String(g.payment_status),
          orders: g._count._all,
          value: num(g._sum.totalAmount),
        })),
        PAYMENT_STATUS_LABELS,
        Object.keys(PAYMENT_STATUS_LABELS),
        current.totals.orders
      ),
      cancellationReasons: cancellation,
      returnReasons: returns,
      trend: trendRows,
      orders: list,
      ordersTruncated: list.length === ORDER_LIST_LIMIT,
    };
  },
};

async function cancellationReasons(where: Prisma.OrderWhereInput): Promise<ReasonRow[]> {
  const cancelledOrders = await db.order.findMany({
    where: { ...where, order_status: "cancelled" },
    select: {
      id: true,
      notes: true,
      totalAmount: true,
      order_status_history: {
        where: { status: "cancelled" },
        orderBy: { created_at: "desc" },
        take: 1,
        select: {
          note: true,
          users_order_status_history_changed_byTousers: { select: { name: true } },
        },
      },
    },
  });

  type Acc = { orders: number; value: number };
  const map = new Map<string, Acc>();

  for (const o of cancelledOrders) {
    const hist = o.order_status_history[0];
    const reason = hist?.note || o.notes || "Customer cancellation / Not stated";
    const by = hist?.users_order_status_history_changed_byTousers?.name ?? "Customer";
    const key = `${reason}:::${by}`;
    const row = map.get(key) ?? { orders: 0, value: 0 };
    row.orders += 1;
    row.value = round2(row.value + num(o.totalAmount));
    map.set(key, row);
  }

  return [...map.entries()]
    .map(([key, v]) => {
      const [reason, by] = key.split(":::");
      return {
        reason,
        by,
        orders: v.orders,
        value: v.value,
      };
    })
    .sort((a, b) => b.orders - a.orders);
}

async function returnReasons(range: ReportRange): Promise<ReasonRow[]> {
  const rows = await db.return_requests.groupBy({
    by: ["reason", "status"],
    where: { is_active: true, requested_at: inRange(range) },
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ reason: r.reason, by: String(r.status), orders: r._count._all, value: 0 }))
    .sort((a, b) => b.orders - a.orders);
}

async function trend(
  range: ReportRange,
  bucket: Bucket,
  filters: OrdersFilters
): Promise<OrdersTrendPoint[]> {
  const key = bucketSql(Prisma.sql`o.created_at`, bucket);
  const rows = await db.$queryRaw<
    { bucket: string; placed: bigint | number; delivered: bigint | number; cancelled: bigint | number }[]
  >(Prisma.sql`
      SELECT ${key} AS bucket,
             COUNT(*) AS placed,
             SUM(o.order_status = 'delivered') AS delivered,
             SUM(o.order_status = 'cancelled') AS cancelled
      FROM orders o
      WHERE o.is_active = 1
        AND o.created_at BETWEEN ${range.from} AND ${range.to}
        ${filters.status ? Prisma.sql`AND o.order_status = ${filters.status}` : Prisma.empty}
        ${filters.paymentStatus ? Prisma.sql`AND o.payment_status = ${filters.paymentStatus}` : Prisma.empty}
      GROUP BY bucket
      ORDER BY bucket
    `);

  return fillSeries(
    rows.map((r) => ({
      bucket: r.bucket,
      placed: Number(r.placed),
      delivered: Number(r.delivered ?? 0),
      cancelled: Number(r.cancelled ?? 0),
    })),
    range,
    bucket,
    (b) => ({ bucket: b, placed: 0, delivered: 0, cancelled: 0 })
  );
}

async function orderList(where: Prisma.OrderWhereInput): Promise<OrderListRow[]> {
  const rows = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: ORDER_LIST_LIMIT,
    select: {
      id: true,
      orderNumber: true,
      placed_at: true,
      createdAt: true,
      updatedAt: true,
      order_status: true,
      payment_status: true,
      totalAmount: true,
      user: { select: { name: true, cust_id: true } },
      order_status_history: {
        where: { status: "delivered" },
        take: 1,
        select: { created_at: true },
      },
      _count: { select: { items: true } },
    },
  });

  return rows.map((o) => {
    const start = o.placed_at ?? o.createdAt;
    const deliveredAt = o.order_status === "delivered" ? (o.order_status_history[0]?.created_at ?? o.updatedAt) : null;
    const deliveryDays =
      deliveredAt && start ? Math.round(((deliveredAt.getTime() - start.getTime()) / DAY_MS) * 10) / 10 : null;
    const customer = `${o.user?.name ?? "Customer"}${o.user?.cust_id ? ` (${o.user.cust_id})` : ""}`;

    return {
      id: String(o.id),
      orderNumber: o.orderNumber,
      placedAt: (o.placed_at ?? o.createdAt)?.toISOString() ?? null,
      customer,
      status: String(o.order_status),
      paymentStatus: String(o.payment_status),
      items: o._count.items,
      value: num(o.totalAmount),
      deliveredAt: deliveredAt?.toISOString() ?? null,
      deliveryDays,
    };
  });
}
