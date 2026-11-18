import { db } from "@/lib/db/prisma";
import {
  InventoryReportResponse,
  InventoryReportRow,
  InventorySummary,
} from "../types";

export interface InventoryReportFilter {
  stockStatus?: "all" | "in_stock" | "low_stock" | "out_of_stock";
  search?: string;
}

export async function getInventoryReport(
  filter: InventoryReportFilter = {}
): Promise<InventoryReportResponse> {
  const items = await db.variantUnitPrice.findMany({
    where: {
      isActive: true,
      deleted_at: null,
    },
    include: {
      variant: {
        select: {
          variant_name: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
      product_units: {
        select: {
          name: true,
        },
      },
      inventories: {
        select: {
          quantity_available: true,
          quantity_reserved: true,
          reorderLevel: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let totalStockUnits = 0;
  let totalValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let healthyStockCount = 0;

  const rows: InventoryReportRow[] = [];

  for (const item of items) {
    const productName = item.variant?.product?.name || "Product";
    const variantName = item.variant?.variant_name || "Standard";
    const unitName = item.product_units?.name || "Pack";
    const price = Number(item.base_price || 0);
    const available = item.inventories?.quantity_available ?? 0;
    const reserved = item.inventories?.quantity_reserved ?? 0;
    const reorderLevel = item.inventories?.reorderLevel ?? 10;
    const stockVal = available * price;

    totalStockUnits += available;
    totalValuation += stockVal;

    let status: InventoryReportRow["status"] = "in_stock";
    if (available <= 0) {
      status = "out_of_stock";
      outOfStockCount += 1;
    } else if (available <= reorderLevel) {
      status = "low_stock";
      lowStockCount += 1;
    } else {
      healthyStockCount += 1;
    }

    // Apply stockStatus filter if provided
    if (filter.stockStatus && filter.stockStatus !== "all") {
      if (status !== filter.stockStatus) {
        continue;
      }
    }

    // Apply search filter if provided
    if (filter.search && filter.search.trim()) {
      const term = filter.search.trim().toLowerCase();
      const match =
        productName.toLowerCase().includes(term) ||
        variantName.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term);
      if (!match) continue;
    }

    rows.push({
      variantUnitPriceId: item.id.toString(),
      productName,
      variantName,
      sku: item.sku,
      unitName,
      basePrice: price,
      availableStock: available,
      reservedStock: reserved,
      reorderLevel,
      totalStockValue: Math.round(stockVal * 100) / 100,
      status,
    });
  }

  const summary: InventorySummary = {
    totalSkus: items.length,
    totalStockUnits,
    totalInventoryValuation: Math.round(totalValuation * 100) / 100,
    lowStockCount,
    outOfStockCount,
    healthyStockCount,
  };

  return {
    summary,
    table: rows,
  };
}
