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
  resolveRange,
  round2,
  type Bucket,
  type ReportRange,
} from "../lib/report-range";
import { resolveCategoryFilter, resolveBrandFilter } from "../lib/report-filters";

export interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  brand?: string;
  paymentMethod?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  tab?: string;
}

export interface SalesTotals {
  orders: number;
  units: number;
  grossSales: number;
  discount: number;
  tax: number;
  shipping: number;
  netSales: number;
  avgOrderValue: number;
}

export interface SalesTrendPoint {
  bucket: string;
  orders: number;
  itemsSold: number;
  grossSales: number;
  discount: number;
  tax: number;
  shipping: number;
  netSales: number;
}

export interface SalesBreakdownRow {
  key: string;
  label: string;
  orders: number;
  units: number;
  netSales: number;
  share: number;
}

export interface SalesReport {
  range: { from: string; to: string; days: number; bucket: Bucket };
  totals: SalesTotals;
  previous: SalesTotals;
  changes: Record<keyof SalesTotals, number | null>;
  trend: SalesTrendPoint[];
  dailyBreakdown: SalesTrendPoint[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  byCategory: SalesBreakdownRow[];
  byBrand: SalesBreakdownRow[];
  byPaymentMethod: SalesBreakdownRow[];
  topProducts: SalesBreakdownRow[];
  topCustomers: SalesBreakdownRow[];
}

const TOTAL_KEYS: (keyof SalesTotals)[] = [
  "orders",
  "units",
  "grossSales",
  "discount",
  "tax",
  "shipping",
  "netSales",
  "avgOrderValue",
];

/** Shared WHERE for the order side of every sales figure. */
function orderWhere(
  filters: SalesFilters,
  categoryId: bigint | null,
  brandId: bigint | null,
  window: { from: Date; to: Date }
): Prisma.OrderWhereInput {
  const itemFilters: Prisma.OrderItemWhereInput[] = [];
  if (categoryId !== null) {
    itemFilters.push({ product: { categoryId } });
  }
  if (brandId !== null) {
    itemFilters.push({ product: { brandId } });
  }

  return {
    ...SOLD_ORDER,
    createdAt: inRange(window),
    ...(itemFilters.length > 0 ? { items: { some: { AND: itemFilters } } } : {}),
    ...(filters.paymentMethod
      ? { payments: { some: { is_active: true, payment_methods: { code: filters.paymentMethod } } } }
      : {}),
  };
}

async function totalsFor(where: Prisma.OrderWhereInput): Promise<SalesTotals> {
  const [agg, unitAgg] = await Promise.all([
    db.order.aggregate({
      where,
      _count: { _all: true },
      _sum: {
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        shipping_charge: true,
        totalAmount: true,
      },
    }),
    db.orderItem.aggregate({ where: { is_active: true, order: where }, _sum: { quantity: true } }),
  ]);

  const orders = agg._count._all;
  const netSales = num(agg._sum.totalAmount);

  return {
    orders,
    units: unitAgg._sum.quantity ?? 0,
    grossSales: num(agg._sum.subtotal),
    discount: num(agg._sum.discountAmount),
    tax: num(agg._sum.taxAmount),
    shipping: num(agg._sum.shipping_charge),
    netSales,
    avgOrderValue: orders ? round2(netSales / orders) : 0,
  };
}

/** Rows keyed by one dimension, sorted by value, with each row's share of the total. */
function withShare(rows: Omit<SalesBreakdownRow, "share">[], total: number, limit?: number): SalesBreakdownRow[] {
  const sorted = [...rows].sort((a, b) => b.netSales - a.netSales);
  const sliced = limit ? sorted.slice(0, limit) : sorted;
  return sliced.map((r) => ({ ...r, share: total ? Math.round((r.netSales / total) * 1000) / 10 : 0 }));
}

export const salesReportService = {
  async summary(filters: SalesFilters): Promise<SalesReport> {
    const range = resolveRange(filters);
    const bucket = pickBucket(range.days);
    const categoryId = await resolveCategoryFilter(filters.category);
    const brandId = await resolveBrandFilter(filters.brand);

    const where = orderWhere(filters, categoryId, brandId, range);
    const prevWhere = orderWhere(filters, categoryId, brandId, { from: range.prevFrom, to: range.prevTo });

    const [totals, previous, trendRows, itemRows, paymentRows, customerRows] = await Promise.all([
      totalsFor(where),
      totalsFor(prevWhere),
      trend(range, bucket, categoryId, brandId),
      itemBreakdown(where),
      paymentBreakdown(where),
      customerBreakdown(where),
    ]);

    const changes = Object.fromEntries(
      TOTAL_KEYS.map((k) => [k, change(totals[k], previous[k])])
    ) as Record<keyof SalesTotals, number | null>;

    // Filter & Paginate Daily Sales Breakdown for the table
    let dailyList = [...trendRows].reverse();
    if (filters.tab === "with_orders") {
      dailyList = dailyList.filter((r) => r.orders > 0);
    } else if (filters.tab === "high_sales") {
      dailyList = dailyList.filter((r) => r.netSales >= 500);
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      dailyList = dailyList.filter((r) => {
        if (r.bucket.toLowerCase().includes(q)) return true;
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(r.bucket);
        if (match) {
          const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
          const formatted = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase();
          if (formatted.includes(q)) return true;
        }
        return false;
      });
    }

    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.max(1, Math.min(5000, Number(filters.limit || 10)));
    const totalDays = dailyList.length;
    const skip = (page - 1) * limit;
    const paginatedDaily = dailyList.slice(skip, skip + limit);

    return {
      range: { from: range.fromISO, to: range.toISO, days: range.days, bucket },
      totals,
      previous,
      changes,
      trend: trendRows,
      dailyBreakdown: paginatedDaily,
      pagination: {
        page,
        limit,
        total: totalDays,
        totalPages: Math.max(1, Math.ceil(totalDays / limit)),
      },
      byCategory: withShare(itemRows.categories, totals.grossSales),
      byBrand: withShare(itemRows.brands, totals.grossSales),
      byPaymentMethod: withShare(paymentRows, totals.netSales),
      topProducts: withShare(itemRows.products, totals.grossSales, 10),
      topCustomers: withShare(customerRows, totals.netSales, 10),
    };
  },
};

async function trend(
  range: ReportRange,
  bucket: Bucket,
  categoryId: bigint | null,
  brandId: bigint | null
): Promise<SalesTrendPoint[]> {
  const key = bucketSql(Prisma.sql`o.created_at`, bucket);
  const hasFilter = categoryId !== null || brandId !== null;

  const [orderRows, itemRows] = await Promise.all([
    db.$queryRaw<
      {
        bucket: string;
        orders: bigint | number;
        gross: Prisma.Decimal | null;
        discount: Prisma.Decimal | null;
        tax: Prisma.Decimal | null;
        shipping: Prisma.Decimal | null;
        net: Prisma.Decimal | null;
      }[]
    >(Prisma.sql`
        SELECT ${key} AS bucket,
               COUNT(DISTINCT o.id) AS orders,
               COALESCE(SUM(o.subtotal), 0) AS gross,
               COALESCE(SUM(o.discount_amount), 0) AS discount,
               COALESCE(SUM(o.tax_amount), 0) AS tax,
               COALESCE(SUM(o.shipping_charge), 0) AS shipping,
               COALESCE(SUM(o.total_amount), 0) AS net
        FROM orders o
        ${
          hasFilter
            ? Prisma.sql`
              JOIN order_items oi ON oi.order_id = o.id AND oi.is_active = 1
              JOIN products p ON oi.product_id = p.id
            `
            : Prisma.empty
        }
        WHERE o.is_active = 1
          AND o.order_status NOT IN ('cancelled', 'returned')
          AND o.created_at BETWEEN ${range.from} AND ${range.to}
          ${categoryId !== null ? Prisma.sql`AND p.category_id = ${categoryId}` : Prisma.empty}
          ${brandId !== null ? Prisma.sql`AND p.brand_id = ${brandId}` : Prisma.empty}
        GROUP BY bucket
        ORDER BY bucket
      `),
    db.$queryRaw<{ bucket: string; units: bigint | number }[]>(Prisma.sql`
        SELECT ${key} AS bucket,
               COALESCE(SUM(oi.quantity), 0) AS units
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        ${hasFilter ? Prisma.sql`JOIN products p ON oi.product_id = p.id` : Prisma.empty}
        WHERE o.is_active = 1
          AND o.order_status NOT IN ('cancelled', 'returned')
          AND o.created_at BETWEEN ${range.from} AND ${range.to}
          AND oi.is_active = 1
          ${categoryId !== null ? Prisma.sql`AND p.category_id = ${categoryId}` : Prisma.empty}
          ${brandId !== null ? Prisma.sql`AND p.brand_id = ${brandId}` : Prisma.empty}
        GROUP BY bucket
      `),
  ]);

  const itemsMap = new Map<string, number>();
  for (const ir of itemRows) {
    itemsMap.set(ir.bucket, Number(ir.units));
  }

  return fillSeries(
    orderRows.map((r) => ({
      bucket: r.bucket,
      orders: Number(r.orders),
      itemsSold: itemsMap.get(r.bucket) ?? 0,
      grossSales: num(r.gross),
      discount: num(r.discount),
      tax: num(r.tax),
      shipping: num(r.shipping),
      netSales: num(r.net),
    })),
    range,
    bucket,
    (b) => ({
      bucket: b,
      orders: 0,
      itemsSold: 0,
      grossSales: 0,
      discount: 0,
      tax: 0,
      shipping: 0,
      netSales: 0,
    })
  );
}

/** Category, brand and product rows all come from the same order-item scan. */
async function itemBreakdown(where: Prisma.OrderWhereInput) {
  const items = await db.orderItem.findMany({
    where: { is_active: true, order: where },
    select: {
      orderId: true,
      productId: true,
      product_name_snapshot: true,
      quantity: true,
      total_price: true,
      product: {
        select: {
          categoryId: true,
          brandId: true,
          brand: { select: { name: true } },
        },
      },
    },
  });

  const categoryIds = [...new Set(items.map((i) => i.product?.categoryId).filter((id): id is bigint => id != null))];
  const categoryNames = categoryIds.length
    ? new Map(
        (await db.productCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })).map(
          (c) => [String(c.id), c.name]
        )
      )
    : new Map<string, string>();

  type Acc = { label: string; orders: Set<string>; units: number; netSales: number };
  const categories = new Map<string, Acc>();
  const brands = new Map<string, Acc>();
  const products = new Map<string, Acc>();

  const bump = (map: Map<string, Acc>, key: string, label: string, orderId: string, units: number, value: number) => {
    const row = map.get(key) ?? { label, orders: new Set<string>(), units: 0, netSales: 0 };
    row.orders.add(orderId);
    row.units += units;
    row.netSales = round2(row.netSales + value);
    map.set(key, row);
  };

  for (const item of items) {
    const orderId = String(item.orderId);
    const value = num(item.total_price);
    const categoryId = item.product?.categoryId;
    bump(
      categories,
      String(categoryId ?? "none"),
      (categoryId != null ? categoryNames.get(String(categoryId)) : null) ?? "Uncategorised",
      orderId,
      item.quantity,
      value
    );
    bump(
      brands,
      String(item.product?.brandId ?? "none"),
      item.product?.brand?.name ?? "No brand",
      orderId,
      item.quantity,
      value
    );
    bump(products, String(item.productId), item.product_name_snapshot, orderId, item.quantity, value);
  }

  const flatten = (map: Map<string, Acc>) =>
    [...map.entries()].map(([key, v]) => ({
      key,
      label: v.label,
      orders: v.orders.size,
      units: v.units,
      netSales: v.netSales,
    }));

  return { categories: flatten(categories), brands: flatten(brands), products: flatten(products) };
}

async function paymentBreakdown(where: Prisma.OrderWhereInput) {
  const payments = await db.payment.findMany({
    where: {
      is_active: true,
      order: where,
    },
    select: {
      orderId: true,
      amount: true,
      payment_methods: {
        select: { name: true, code: true },
      },
    },
  });

  type Acc = { label: string; orders: Set<string>; netSales: number };
  const map = new Map<string, Acc>();
  for (const p of payments) {
    const code = p.payment_methods?.code ?? "direct";
    const label = p.payment_methods?.name ?? "Direct / Net Banking";
    const row = map.get(code) ?? { label, orders: new Set<string>(), netSales: 0 };
    row.orders.add(String(p.orderId));
    row.netSales = round2(row.netSales + num(p.amount));
    map.set(code, row);
  }

  return [...map.entries()].map(([key, v]) => ({
    key,
    label: v.label,
    orders: v.orders.size,
    units: 0,
    netSales: v.netSales,
  }));
}

async function customerBreakdown(where: Prisma.OrderWhereInput) {
  const rows = await db.order.groupBy({
    by: ["userId"],
    where,
    _count: { _all: true },
    _sum: { totalAmount: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 25,
  });
  if (rows.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true, cust_id: true },
  });
  const byId = new Map(users.map((u) => [String(u.id), u]));

  return rows.map((r) => {
    const u = byId.get(String(r.userId));
    return {
      key: String(r.userId),
      label: u ? `${u.name}${u.cust_id ? ` (${u.cust_id})` : ""}` : `Customer #${r.userId}`,
      orders: r._count._all,
      units: 0,
      netSales: num(r._sum.totalAmount),
    };
  });
}
