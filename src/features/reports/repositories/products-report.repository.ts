import { db } from "@/lib/db/prisma";
import {
  ReportPeriod,
  ProductsReportResponse,
  ProductReportRow,
  CategoryBreakdown,
  ProductsSummary,
} from "../types";
import { resolveReportDateRange } from "../utils/date-ranges";

export interface ProductsReportFilter {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  search?: string;
}

export async function getProductsReport(
  filter: ProductsReportFilter = {}
): Promise<ProductsReportResponse> {
  const period = filter.period || "this_month";
  const { startDate, endDate, startIso, endIso } = resolveReportDateRange(
    period,
    filter.startDate,
    filter.endDate
  );

  // Pre-load category map
  const categories = await db.productCategory.findMany({
    select: {
      id: true,
      name: true,
    },
  });
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.id.toString(), c.name);
  }

  const orderItemWhere: any = {
    is_active: true,
    order: {
      is_active: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      order_status: {
        notIn: ["cancelled", "returned"],
      },
    },
  };

  if (filter.categoryId && filter.categoryId !== "all") {
    orderItemWhere.product = {
      categoryId: BigInt(filter.categoryId),
    };
  }

  // Fetch all sold items in period with product, variant, and inventory relations
  const items = await db.orderItem.findMany({
    where: orderItemWhere,
    select: {
      productId: true,
      variantId: true,
      product_name_snapshot: true,
      variant_snapshot: true,
      sku_snapshot: true,
      quantity: true,
      total_price: true,
      product: {
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      },
      variant: {
        select: {
          variant_name: true,
        },
      },
      variant_unit_price: {
        select: {
          sku: true,
          inventories: {
            select: {
              quantity_available: true,
              reorderLevel: true,
            },
          },
        },
      },
    },
  });

  // Group items by SKU / Variant
  const productMap: Record<
    string,
    {
      productId: string;
      productName: string;
      variantName: string;
      sku: string;
      categoryName: string;
      unitsSold: number;
      revenue: number;
      currentStock: number;
      reorderLevel: number;
    }
  > = {};

  const categoryAggMap: Record<string, { units: number; revenue: number }> = {};

  let totalUnits = 0;
  let totalRevenue = 0;

  for (const item of items) {
    const sku =
      item.variant_unit_price?.sku ||
      item.sku_snapshot ||
      `P${item.productId}-V${item.variantId}`;
    const productName = item.product?.name || item.product_name_snapshot || "Snack Product";
    const variantName = item.variant?.variant_name || item.variant_snapshot || "Standard";
    const catId = item.product?.categoryId ? item.product.categoryId.toString() : null;
    const categoryName = (catId && categoryMap.get(catId)) || "Snacks";
    const qty = item.quantity || 0;
    const price = Number(item.total_price || 0);
    const stock = item.variant_unit_price?.inventories?.quantity_available ?? 0;
    const reorder = item.variant_unit_price?.inventories?.reorderLevel ?? 10;

    totalUnits += qty;
    totalRevenue += price;

    // Grouping by SKU
    if (!productMap[sku]) {
      productMap[sku] = {
        productId: item.productId.toString(),
        productName,
        variantName,
        sku,
        categoryName,
        unitsSold: 0,
        revenue: 0,
        currentStock: stock,
        reorderLevel: reorder,
      };
    }

    productMap[sku].unitsSold += qty;
    productMap[sku].revenue += price;

    // Category aggregation
    if (!categoryAggMap[categoryName]) {
      categoryAggMap[categoryName] = { units: 0, revenue: 0 };
    }
    categoryAggMap[categoryName].units += qty;
    categoryAggMap[categoryName].revenue += price;
  }

  // Filter by search if provided
  let productEntries = Object.values(productMap);
  if (filter.search && filter.search.trim()) {
    const query = filter.search.trim().toLowerCase();
    productEntries = productEntries.filter(
      (p) =>
        p.productName.toLowerCase().includes(query) ||
        p.variantName.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.categoryName.toLowerCase().includes(query)
    );
  }

  // Sort by units sold descending
  productEntries.sort((a, b) => b.unitsSold - a.unitsSold);

  const table: ProductReportRow[] = productEntries.map((p) => {
    let stockStatus: ProductReportRow["stockStatus"] = "in_stock";
    if (p.currentStock <= 0) {
      stockStatus = "out_of_stock";
    } else if (p.currentStock <= p.reorderLevel) {
      stockStatus = "low_stock";
    }

    return {
      productId: p.productId,
      productName: p.productName,
      variantName: p.variantName,
      sku: p.sku,
      categoryName: p.categoryName,
      unitsSold: p.unitsSold,
      revenue: Math.round(p.revenue * 100) / 100,
      currentStock: p.currentStock,
      stockStatus,
    };
  });

  // Top Product
  const topProductEntry = productEntries[0];
  const topProduct = topProductEntry
    ? {
        name: `${topProductEntry.productName} (${topProductEntry.variantName})`,
        units: topProductEntry.unitsSold,
        revenue: Math.round(topProductEntry.revenue * 100) / 100,
      }
    : null;

  // Category breakdown list
  const categoryBreakdown: CategoryBreakdown[] = Object.keys(categoryAggMap).map((catName) => {
    const cat = categoryAggMap[catName];
    return {
      categoryName: catName,
      units: cat.units,
      revenue: Math.round(cat.revenue * 100) / 100,
      sharePercent:
        totalRevenue > 0 ? Math.round((cat.revenue / totalRevenue) * 1000) / 10 : 0,
    };
  });
  categoryBreakdown.sort((a, b) => b.revenue - a.revenue);

  const summary: ProductsSummary = {
    distinctProductsSold: productEntries.length,
    totalUnitsSold: totalUnits,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    topProduct,
  };

  return {
    period,
    dateRange: { start: startIso, end: endIso },
    summary,
    categoryBreakdown,
    table,
  };
}
