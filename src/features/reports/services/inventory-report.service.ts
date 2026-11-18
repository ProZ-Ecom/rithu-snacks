import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/prisma";
import { inRange, num, ratio, resolveRange, round2 } from "../lib/report-range";
import { resolveBrandFilter, resolveCategoryFilter } from "../lib/report-filters";
import { STOCK_MOVEMENT_LABELS } from "../lib/report-labels";

export interface InventoryFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  brand?: string;
  /** "low" | "out" | "dead" narrows the SKU table to that bucket. */
  bucket?: string;
}

export interface InventoryTotals {
  skus: number;
  unitsOnHand: number;
  unitsReserved: number;
  /** Units on hand less what carts and open orders have already claimed. */
  unitsSellable: number;
  valueAtCost: number;
  valueAtPrice: number;
  costedSkus: number;
  outOfStock: number;
  lowStock: number;
  deadStock: number;
  movementIn: number;
  movementOut: number;
}

export interface StockRow {
  key: string;
  sku: string;
  product: string;
  category: string;
  brand: string;
  onHand: number;
  reserved: number;
  sellable: number;
  reorderLevel: number;
  price: number;
  avgCost: number | null;
  valueAtCost: number | null;
  valueAtPrice: number;
  soldInRange: number;
  lastMovementAt: string | null;
  status: "out" | "low" | "ok";
}

export interface MovementRow {
  key: string;
  movementType: string;
  label: string;
  direction: "in" | "out";
  entries: number;
  units: number;
}

export interface LedgerRow {
  id: string;
  at: string;
  sku: string;
  type: string;
  movementType: string | null;
  quantity: number;
  previousStock: number | null;
  newStock: number | null;
  reference: string | null;
  note: string | null;
}

export interface InventoryReport {
  range: { from: string; to: string; days: number };
  totals: InventoryTotals;
  rows: StockRow[];
  rowsTruncated: boolean;
  movements: MovementRow[];
  ledger: LedgerRow[];
  ledgerTruncated: boolean;
  alerts: { outOfStock: StockRow[]; lowStock: StockRow[]; deadStock: StockRow[] };
}

const ROW_LIMIT = 1000;
const LEDGER_LIMIT = 200;
const ALERT_LIMIT = 50;
const DEAD_DAYS = 90;

export const inventoryReportService = {
  async summary(filters: InventoryFilters): Promise<InventoryReport> {
    const range = resolveRange(filters);
    const [categoryId, brandId] = await Promise.all([
      resolveCategoryFilter(filters.category),
      resolveBrandFilter(filters.brand),
    ]);

    const productWhere: Prisma.ProductWhereInput = {
      ...(categoryId !== null ? { categoryId } : {}),
      ...(brandId !== null ? { brandId } : {}),
    };
    const hasProductFilter = categoryId !== null || brandId !== null;

    const skus = await db.variantUnitPrice.findMany({
      where: {
        isActive: true,
        deleted_at: null,
        ...(hasProductFilter ? { variant: { product: productWhere } } : {}),
      },
      select: {
        id: true,
        sku: true,
        base_price: true,
        inventories: { select: { quantity_available: true, quantity_reserved: true, reorderLevel: true } },
        variant: {
          select: {
            variant_name: true,
            product: { select: { name: true, categoryId: true, brand: { select: { name: true } } } },
          },
        },
      },
    });

    const ids = skus.map((s) => s.id);

    const [soldRows, lastMovementRows, movementRows, ledger, categoryNames] = await Promise.all([
      soldInRange(range, ids),
      lastMovementPerSku(ids),
      movementSummary(range, ids),
      recentLedger(range, ids),
      categoryNameMap(
        skus.map((s) => {
          const id = s.variant?.product?.categoryId;
          return id != null ? String(id) : null;
        })
      ),
    ]);

    const now = Date.now();
    const deadCutoff = now - DEAD_DAYS * 86_400_000;

    const rows: StockRow[] = skus.map((s) => {
      const inv = s.inventories;
      const onHand = inv?.quantity_available ?? 0;
      const reserved = inv?.quantity_reserved ?? 0;
      const reorderLevel = inv?.reorderLevel ?? 0;
      const price = num(s.base_price);
      const product = s.variant?.product;
      const categoryId = product?.categoryId;
      const last = lastMovementRows.get(String(s.id)) ?? null;

      return {
        key: String(s.id),
        sku: s.sku,
        product: product?.name ? `${product.name} (${s.variant?.variant_name || ""})` : "—",
        category: (categoryId != null ? categoryNames.get(String(categoryId)) : null) ?? "Uncategorised",
        brand: product?.brand?.name ?? "No brand",
        onHand,
        reserved,
        sellable: Math.max(0, onHand - reserved),
        reorderLevel,
        price,
        avgCost: null,
        valueAtCost: null,
        valueAtPrice: round2(price * onHand),
        soldInRange: soldRows.get(String(s.id)) ?? 0,
        lastMovementAt: last?.toISOString() ?? null,
        status: onHand <= 0 ? "out" : onHand <= reorderLevel ? "low" : "ok",
      };
    });

    const outOfStock = rows.filter((r) => r.status === "out");
    const lowStock = rows.filter((r) => r.status === "low");
    const deadStock = rows.filter(
      (r) => r.onHand > 0 && r.soldInRange === 0 && (!r.lastMovementAt || new Date(r.lastMovementAt).getTime() < deadCutoff)
    );

    const movementIn = movementRows.filter((m) => m.direction === "in").reduce((s, m) => s + m.units, 0);
    const movementOut = movementRows.filter((m) => m.direction === "out").reduce((s, m) => s + m.units, 0);

    const visible =
      filters.bucket === "out"
        ? outOfStock
        : filters.bucket === "low"
          ? lowStock
          : filters.bucket === "dead"
            ? deadStock
            : rows;

    const sorted = [...visible].sort((a, b) => b.valueAtPrice - a.valueAtPrice);

    return {
      range: { from: range.fromISO, to: range.toISO, days: range.days },
      totals: {
        skus: rows.length,
        unitsOnHand: rows.reduce((s, r) => s + r.onHand, 0),
        unitsReserved: rows.reduce((s, r) => s + r.reserved, 0),
        unitsSellable: rows.reduce((s, r) => s + r.sellable, 0),
        valueAtCost: 0,
        valueAtPrice: round2(rows.reduce((s, r) => s + r.valueAtPrice, 0)),
        costedSkus: 0,
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
        deadStock: deadStock.length,
        movementIn,
        movementOut,
      },
      rows: sorted.slice(0, ROW_LIMIT),
      rowsTruncated: sorted.length > ROW_LIMIT,
      movements: movementRows,
      ledger,
      ledgerTruncated: ledger.length === LEDGER_LIMIT,
      alerts: {
        outOfStock: outOfStock.slice(0, ALERT_LIMIT),
        lowStock: lowStock.slice(0, ALERT_LIMIT),
        deadStock: [...deadStock]
          .sort((a, b) => b.valueAtPrice - a.valueAtPrice)
          .slice(0, ALERT_LIMIT),
      },
    };
  },
};

export const costCoverage = (costedSkus: number, skus: number) => ratio(costedSkus, skus);

async function categoryNameMap(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => id != null))];
  if (unique.length === 0) return new Map();
  const rows = await db.productCategory.findMany({
    where: { id: { in: unique.map((id) => BigInt(id)) } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [String(r.id), r.name]));
}

async function soldInRange(range: { from: Date; to: Date }, ids: bigint[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await db.orderItem.groupBy({
    by: ["variantUnitPriceId"],
    where: {
      is_active: true,
      variantUnitPriceId: { in: ids },
      order: { is_active: true, order_status: { notIn: ["cancelled", "returned"] }, createdAt: inRange(range) },
    },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [String(r.variantUnitPriceId), r._sum.quantity ?? 0]));
}

async function lastMovementPerSku(ids: bigint[]): Promise<Map<string, Date>> {
  if (ids.length === 0) return new Map();
  const rows = await db.inventoryTransaction.groupBy({
    by: ["variant_unit_price_id"],
    where: { is_active: true, variant_unit_price_id: { in: ids } },
    _max: { createdAt: true },
  });
  const map = new Map<string, Date>();
  for (const r of rows) {
    if (r._max.createdAt) map.set(String(r.variant_unit_price_id), r._max.createdAt);
  }
  return map;
}

async function movementSummary(range: { from: Date; to: Date }, ids: bigint[]): Promise<MovementRow[]> {
  if (ids.length === 0) return [];
  const rows = await db.inventoryTransaction.groupBy({
    by: ["type", "referenceType"],
    where: { is_active: true, variant_unit_price_id: { in: ids }, createdAt: inRange(range) },
    _count: { _all: true },
    _sum: { quantity: true },
  });

  return rows
    .map((r) => {
      const typeStr = String(r.type);
      const refStr = r.referenceType ? String(r.referenceType) : "";
      const direction: "in" | "out" = typeStr === "in" || typeStr === "released" ? "in" : "out";
      const key = `${typeStr}-${refStr}`;
      const friendlyName = STOCK_MOVEMENT_LABELS[refStr] || (refStr ? `${typeStr.toUpperCase()} (${refStr})` : typeStr.toUpperCase());
      return {
        key,
        movementType: refStr || typeStr,
        label: friendlyName,
        direction,
        entries: r._count._all,
        units: Math.abs(r._sum.quantity ?? 0),
      };
    })
    .sort((a, b) => b.units - a.units);
}

async function recentLedger(range: { from: Date; to: Date }, ids: bigint[]): Promise<LedgerRow[]> {
  if (ids.length === 0) return [];
  const rows = await db.inventoryTransaction.findMany({
    where: { is_active: true, variant_unit_price_id: { in: ids }, createdAt: inRange(range) },
    orderBy: { createdAt: "desc" },
    take: LEDGER_LIMIT,
    select: {
      id: true,
      createdAt: true,
      type: true,
      referenceType: true,
      referenceId: true,
      quantity: true,
      note: true,
      variant_unit_price: { select: { sku: true } },
    },
  });

  return rows.map((r) => ({
    id: String(r.id),
    at: r.createdAt.toISOString(),
    sku: r.variant_unit_price?.sku ?? "—",
    type: String(r.type),
    movementType: r.referenceType ? (STOCK_MOVEMENT_LABELS[r.referenceType] ?? r.referenceType) : null,
    quantity: r.quantity,
    previousStock: null,
    newStock: null,
    reference: r.referenceId ? `${r.referenceType ?? "Ref"} #${r.referenceId}` : null,
    note: r.note,
  }));
}
