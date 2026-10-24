import { db } from "@/lib/db/prisma";
import type {
  DashboardFullData,
  TimePeriod,
  ChartDataPoint,
  PipelineStage,
  TopSellingProduct,
  RecentOrderDto,
  RestockAlertDto,
} from "../types";

/**
 * Calculates date windows for current and previous comparison periods
 */
function calculatePeriodRanges(period: TimePeriod = "this_month") {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  let periodStart: Date;
  let periodEnd: Date = now;
  let prevPeriodStart: Date;
  let prevPeriodEnd: Date;
  let periodLabel = "This Month";

  if (period === "today") {
    periodStart = todayStart;
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    periodLabel = "Today";
  } else if (period === "this_week") {
    const day = now.getDay();
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    periodStart = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth(), diff - 7, 0, 0, 0, 0);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), diff - 1, 23, 59, 59, 999);
    periodLabel = "This Week";
  } else if (period === "last_month") {
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    const monthName = periodStart.toLocaleString("en-IN", { month: "short" });
    periodLabel = `${monthName} (Last Month)`;
  } else if (period === "this_year") {
    const currentYear = now.getFullYear();
    periodStart = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    periodEnd = now;
    prevPeriodStart = new Date(currentYear - 1, 0, 1, 0, 0, 0, 0);
    prevPeriodEnd = new Date(currentYear - 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    periodLabel = `${currentYear} (This Year)`;
  } else if (period === "custom") {
    periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    prevPeriodEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    periodLabel = "Past 30 Days";
  } else {
    // this_month default
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const monthName = now.toLocaleString("en-IN", { month: "short" });
    periodLabel = `${monthName} Cycle`;
  }

  return {
    now,
    todayStart,
    periodStart,
    periodEnd,
    prevPeriodStart,
    prevPeriodEnd,
    periodLabel,
  };
}

export async function getDashboardData(period: TimePeriod = "this_month"): Promise<DashboardFullData> {
  const {
    now,
    todayStart,
    periodStart,
    periodEnd,
    prevPeriodStart,
    prevPeriodEnd,
  } = calculatePeriodRanges(period);

  // 1. Gather live baseline DB counts & totals
  const [
    totalProductsCount,
    totalCategoriesCount,
    totalCustomersCount,
    allTimeOrdersCount,
    periodOrdersCount,
    prevPeriodOrdersCount,
    periodRevenueResult,
    prevPeriodRevenueResult,
    todayOrdersCount,
    todayRevenueResult,
    pendingOrdersCount,
    deliveredOrdersCount,
    cancelledOrdersCount,
  ] = await Promise.all([
    // Active Products in catalog
    db.product.count({ where: { isActive: true, deleted_at: null } }).catch(() => 0),
    // Active Categories
    db.productCategory.count({ where: { isActive: true, deleted_at: null } }).catch(() => 0),
    // Total Registered Customers
    db.user.count({ where: { is_active: true, deleted_at: null } }).catch(() => 0),
    // Lifetime orders
    db.order.count({ where: { is_active: true } }).catch(() => 0),
    // Period orders
    db.order.count({
      where: {
        is_active: true,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }).catch(() => 0),
    // Previous period orders
    db.order.count({
      where: {
        is_active: true,
        createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
      },
    }).catch(() => 0),
    // Period gross revenue
    db.order.aggregate({
      where: {
        is_active: true,
        createdAt: { gte: periodStart, lte: periodEnd },
        order_status: { notIn: ["cancelled", "returned"] },
      },
      _sum: { totalAmount: true },
    }).catch(() => ({ _sum: { totalAmount: null } })),
    // Previous period revenue
    db.order.aggregate({
      where: {
        is_active: true,
        createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
        order_status: { notIn: ["cancelled", "returned"] },
      },
      _sum: { totalAmount: true },
    }).catch(() => ({ _sum: { totalAmount: null } })),
    // Today orders
    db.order.count({
      where: {
        is_active: true,
        createdAt: { gte: todayStart },
      },
    }).catch(() => 0),
    // Today revenue
    db.order.aggregate({
      where: {
        is_active: true,
        createdAt: { gte: todayStart },
        order_status: { notIn: ["cancelled", "returned"] },
      },
      _sum: { totalAmount: true },
    }).catch(() => ({ _sum: { totalAmount: null } })),
    // Pending orders awaiting dispatch
    db.order.count({
      where: {
        is_active: true,
        order_status: { in: ["pending", "processing", "confirmed"] },
      },
    }).catch(() => 0),
    // Delivered orders in period
    db.order.count({
      where: {
        is_active: true,
        order_status: "delivered",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }).catch(() => 0),
    // Cancelled or returned orders in period
    db.order.count({
      where: {
        is_active: true,
        order_status: { in: ["cancelled", "returned"] },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }).catch(() => 0),
  ]);

  const currentRevenue = Number(periodRevenueResult._sum?.totalAmount || 0);
  const prevRevenue = Number(prevPeriodRevenueResult._sum?.totalAmount || 0);
  const todayRevenue = Number(todayRevenueResult._sum?.totalAmount || 0);

  // Revenue & Customer growth percentages
  let revenueGrowthPercent = 0;
  if (prevRevenue > 0) {
    revenueGrowthPercent = Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 1000) / 10;
  } else if (currentRevenue > 0) {
    revenueGrowthPercent = 100;
  }

  let customerGrowthPercent = 0;
  if (prevPeriodOrdersCount > 0) {
    customerGrowthPercent = Math.round(((periodOrdersCount - prevPeriodOrdersCount) / prevPeriodOrdersCount) * 1000) / 10;
  } else if (periodOrdersCount > 0) {
    customerGrowthPercent = 100;
  }

  // Fulfillment rate
  const fulfillmentRatePercent =
    periodOrdersCount > 0
      ? Math.round((deliveredOrdersCount / periodOrdersCount) * 1000) / 10
      : 100;

  // Average daily revenue comparison for today
  const daysInPeriod = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const avgDailyRevenue = currentRevenue / daysInPeriod;
  const todayAvgComparison =
    avgDailyRevenue > 0
      ? Math.round(((todayRevenue - avgDailyRevenue) / avgDailyRevenue) * 1000) / 10
      : 0;

  // 2. Fetch Order Pipeline Distribution from live DB
  const pipelineCounts = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  try {
    const statusGroups = await db.order.groupBy({
      by: ["order_status"],
      where: { is_active: true },
      _count: { id: true },
    });

    for (const g of statusGroups) {
      const status = (g.order_status || "").toLowerCase();
      const count = g._count.id;
      if (status === "pending" || status === "placed" || status === "created") {
        pipelineCounts.pending += count;
      } else if (status === "confirmed" || status === "paid" || status === "approved") {
        pipelineCounts.confirmed += count;
      } else if (status === "processing" || status === "packed" || status === "packaging") {
        pipelineCounts.processing += count;
      } else if (status === "shipped" || status === "out_for_delivery" || status === "in_transit" || status === "dispatched") {
        pipelineCounts.shipped += count;
      } else if (status === "delivered" || status === "completed") {
        pipelineCounts.delivered += count;
      } else if (status === "cancelled" || status === "returned" || status === "refunded") {
        pipelineCounts.cancelled += count;
      }
    }
  } catch {
    // Handle gracefully
  }

  const totalPipeline = Object.values(pipelineCounts).reduce((a, b) => a + b, 0) || 1;
  const pipeline: PipelineStage[] = [
    {
      id: "pending",
      name: "Pending Confirmation",
      count: pipelineCounts.pending,
      percentage: Math.round((pipelineCounts.pending / totalPipeline) * 100),
      color: "bg-amber-500",
      statusKey: "pending",
    },
    {
      id: "confirmed",
      name: "Confirmed & Payment Cleared",
      count: pipelineCounts.confirmed,
      percentage: Math.round((pipelineCounts.confirmed / totalPipeline) * 100),
      color: "bg-blue-500",
      statusKey: "confirmed",
    },
    {
      id: "processing",
      name: "Packing & Quality Check",
      count: pipelineCounts.processing,
      percentage: Math.round((pipelineCounts.processing / totalPipeline) * 100),
      color: "bg-purple-500",
      statusKey: "processing",
    },
    {
      id: "shipped",
      name: "In Transit / Dispatched",
      count: pipelineCounts.shipped,
      percentage: Math.round((pipelineCounts.shipped / totalPipeline) * 100),
      color: "bg-teal-500",
      statusKey: "shipped",
    },
    {
      id: "delivered",
      name: "Successfully Delivered",
      count: pipelineCounts.delivered,
      percentage: Math.round((pipelineCounts.delivered / totalPipeline) * 100),
      color: "bg-emerald-600",
      statusKey: "delivered",
    },
    {
      id: "cancelled",
      name: "Cancelled / Returned",
      count: pipelineCounts.cancelled,
      percentage: Math.round((pipelineCounts.cancelled / totalPipeline) * 100),
      color: "bg-rose-500",
      statusKey: "cancelled",
    },
  ];

  const successRate =
    allTimeOrdersCount > 0
      ? Math.round(
          ((pipelineCounts.delivered + pipelineCounts.shipped + pipelineCounts.processing + pipelineCounts.confirmed) /
            allTimeOrdersCount) *
            1000
        ) / 10
      : 100;

  const hubSla =
    allTimeOrdersCount > 0
      ? Math.round((pipelineCounts.delivered / allTimeOrdersCount) * 1000) / 10
      : 100;

  // 3. Fetch Recent Orders from live DB
  let recentOrders: RecentOrderDto[] = [];
  try {
    const rawOrders = await db.order.findMany({
      take: 8,
      where: { is_active: true },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        address: {
          where: { is_active: true },
          select: { city: true, state: true, full_name: true },
          take: 1,
        },
        items: {
          where: { is_active: true },
          select: {
            product_name_snapshot: true,
            variant_snapshot: true,
            quantity: true,
          },
          take: 3,
        },
        payments: {
          where: { is_active: true },
          select: {
            gateway: true,
            status: true,
          },
          take: 1,
        },
      },
    });

    if (rawOrders && rawOrders.length > 0) {
      recentOrders = rawOrders.map((o) => {
        const customerName = o.user?.name || o.address?.[0]?.full_name || "Customer";
        const city = o.address?.[0]?.city || "Hub Location";
        const state = o.address?.[0]?.state || "TN";
        const itemsSummary =
          o.items.length > 0
            ? o.items.map((i) => `${i.product_name_snapshot} x ${i.quantity}`).join(", ")
            : "Store Products Order";

        const orderStatus = (o.order_status?.toLowerCase() as RecentOrderDto["status"]) || "confirmed";

        let paymentMethod = "UPI";
        const paymentRecord = o.payments?.[0];
        if (paymentRecord?.gateway) {
          paymentMethod = paymentRecord.gateway;
        }

        const dateObj = new Date(o.createdAt);
        const isToday = dateObj.toDateString() === now.toDateString();
        const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        const placedTime = isToday
          ? `Today, ${timeStr}`
          : `${dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}, ${timeStr}`;

        return {
          id: String(o.id),
          orderNumber: o.orderNumber || `#ORD-${o.id}`,
          customerName,
          city,
          state,
          basketSummary: itemsSummary,
          itemCount: o.items.length || 1,
          amount: Number(o.totalAmount || 0),
          paymentMethod,
          paymentProvider: paymentMethod,
          status: orderStatus,
          placedTime,
          createdAt: o.createdAt.toISOString(),
        };
      });
    }
  } catch {
    // Empty list if error
  }

  // 4. Fetch Top Selling Products by aggregating actual order items
  let topProducts: TopSellingProduct[] = [];
  try {
    // 4a. Aggregate order items in current period or lifetime
    const periodGroupResult = await db.orderItem.groupBy({
      by: ["productId"],
      where: {
        is_active: true,
        order: {
          is_active: true,
          order_status: { notIn: ["cancelled", "returned"] },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      },
      _sum: {
        quantity: true,
        total_price: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    const lifetimeGroupResult =
      periodGroupResult.length > 0
        ? []
        : await db.orderItem.groupBy({
            by: ["productId"],
            where: {
              is_active: true,
              order: {
                is_active: true,
                order_status: { notIn: ["cancelled", "returned"] },
              },
            },
            _sum: {
              quantity: true,
              total_price: true,
            },
            orderBy: {
              _sum: {
                quantity: "desc",
              },
            },
            take: 5,
          });

    const topItemGroups = periodGroupResult.length > 0 ? periodGroupResult : lifetimeGroupResult;

    const productIdsToFetch = topItemGroups
      .map((g) => g.productId)
      .filter((id): id is bigint => id !== null && id !== undefined);

    // If still no order items, fetch active products from catalog
    let productsFromDb: any[] = [];
    const productIncludeArgs = {
      images: {
        where: { is_active: true },
        orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
      },
      variants: {
        where: { isActive: true, deleted_at: null },
        include: {
          product_variant_images: {
            where: { is_active: true },
            orderBy: [{ is_primary: "desc" as const }, { sort_order: "asc" as const }],
          },
        },
      },
    };

    if (productIdsToFetch.length > 0) {
      productsFromDb = await db.product.findMany({
        where: {
          id: { in: productIdsToFetch },
          isActive: true,
          deleted_at: null,
        },
        include: productIncludeArgs,
      });
    } else {
      productsFromDb = await db.product.findMany({
        where: { isActive: true, deleted_at: null },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: productIncludeArgs,
      });
    }

    // Resolve categories
    const categoryIds = productsFromDb
      .map((p) => p.categoryId)
      .filter((id): id is bigint => id !== null && id !== undefined);

    const categories = await db.productCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map<string, string>(categories.map((c) => [String(c.id), c.name]));

    // Resolve stock levels for these products
    const productInternalIds = productsFromDb.map((p) => p.id);
    const inventories = await db.inventory.findMany({
      where: {
        is_active: true,
        variant_unit_price: {
          variant: {
            productId: { in: productInternalIds },
          },
        },
      },
      select: {
        quantity_available: true,
        reorderLevel: true,
        variant_unit_price: {
          select: {
            variant: { select: { productId: true } },
          },
        },
      },
    });

    // Map total stock per product
    const stockMap = new Map<string, { total: number; minReorder: number }>();
    for (const inv of inventories) {
      const pId = String(inv.variant_unit_price?.variant?.productId || "");
      if (!pId) continue;
      const current = stockMap.get(pId) || { total: 0, minReorder: Number(inv.reorderLevel || 10) };
      current.total += Number(inv.quantity_available || 0);
      stockMap.set(pId, current);
    }

    topProducts = productsFromDb.map((p) => {
      const pId = String(p.id);
      const groupData = topItemGroups.find((g) => String(g.productId) === pId);
      const unitsSold = Number(groupData?._sum?.quantity || 0);
      const revenue = Number(groupData?._sum?.total_price || 0);
      const stockInfo = stockMap.get(pId) || { total: 0, minReorder: 10 };

      let stockStatus: TopSellingProduct["stockStatus"] = "in_stock";
      if (stockInfo.total === 0) {
        stockStatus = "out_of_stock";
      } else if (stockInfo.total <= stockInfo.minReorder) {
        stockStatus = "low_stock";
      }

      // Resolve primary image from product.images or variant images
      let resolvedImg: string | null =
        p.images?.find((img: any) => img.isPrimary)?.image_url ||
        p.images?.[0]?.image_url ||
        null;

      if (!resolvedImg && p.variants && p.variants.length > 0) {
        const defaultVar = p.variants.find((v: any) => v.is_default) ?? p.variants[0];
        const primaryVarImg =
          defaultVar?.product_variant_images?.find((img: any) => img.is_primary) ??
          defaultVar?.product_variant_images?.[0];
        resolvedImg = primaryVarImg?.image_url ?? null;

        if (!resolvedImg) {
          for (const v of p.variants) {
            const vImg =
              v.product_variant_images?.find((img: any) => img.is_primary) ??
              v.product_variant_images?.[0];
            if (vImg?.image_url) {
              resolvedImg = vImg.image_url;
              break;
            }
          }
        }
      }

      if (resolvedImg && typeof resolvedImg === "string") {
        const trimmed = resolvedImg.trim();
        if (trimmed && trimmed !== "null" && trimmed !== "undefined") {
          resolvedImg =
            trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")
              ? trimmed
              : `/${trimmed}`;
        } else {
          resolvedImg = null;
        }
      }

      return {
        id: pId,
        name: p.name,
        category: (p.categoryId ? categoryMap.get(String(p.categoryId)) : null) || "General Snacks",
        sku: p.sku || `SKU-${p.id}`,
        unitsSold,
        revenue,
        stockQuantity: stockInfo.total,
        stockStatus,
        image: resolvedImg,
      };
    });
  } catch (err) {
    console.error("Error in getDashboardData topProducts:", err);
  }

  // 5. Restock & Procurement Alerts from live inventory table
  let restockAlerts: RestockAlertDto[] = [];
  let lowStockCount = 0;
  try {
    const rawLowStock = await db.inventory.findMany({
      where: {
        is_active: true,
        variant_unit_price: {
          deleted_at: null,
          variant: {
            deleted_at: null,
            product: {
              deleted_at: null,
              isActive: true,
            },
          },
        },
      },
      include: {
        variant_unit_price: {
          include: {
            product_units: { select: { name: true, code: true } },
            variant: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
          },
        },
      },
      orderBy: { quantity_available: "asc" },
      take: 20,
    });

    // Filter items where available <= reorderLevel or available === 0
    const filteredUrgent = rawLowStock.filter((item) => {
      const available = Number(item.quantity_available ?? 0);
      const minThreshold = Number(item.reorderLevel ?? 10);
      return available <= minThreshold || available === 0;
    });

    lowStockCount = filteredUrgent.length;

    restockAlerts = filteredUrgent.slice(0, 4).map((item) => {
      const variant = item.variant_unit_price?.variant;
      const product = variant?.product;
      const available = Number(item.quantity_available ?? 0);
      const minThreshold = Number(item.reorderLevel ?? 10);
      const unitName =
        item.variant_unit_price?.product_units?.name ||
        item.variant_unit_price?.product_units?.code ||
        "packs";

      const isOut = available === 0;
      const isCritical = available <= Math.max(1, Math.floor(minThreshold / 2));

      let status: RestockAlertDto["status"] = "low_stock";
      if (isOut) status = "out_of_stock";
      else if (isCritical) status = "critical";

      const productName = product?.name || "Product";
      const variantName = variant?.variant_name ? ` (${variant.variant_name})` : "";

      return {
        id: String(item.id),
        name: `${productName}${variantName}`,
        sku: item.variant_unit_price?.sku || product?.sku || `SKU-${item.id}`,
        available,
        minThreshold,
        unit: unitName,
        status,
        actionLabel: isOut ? "Priority Re-order" : "Restock Inventory",
      };
    });
  } catch {
    // Empty list if error
  }

  // 6. Dynamic Time-Series Chart Data Points from live orders (up to current date/time)
  let chartData: ChartDataPoint[] = [];
  try {
    const rawOrdersForChart = await db.order.findMany({
      where: {
        is_active: true,
        createdAt: { gte: periodStart, lte: periodEnd },
        order_status: { notIn: ["cancelled", "returned"] },
      },
      select: {
        createdAt: true,
        totalAmount: true,
        items: {
          where: { is_active: true },
          select: {
            product_name_snapshot: true,
            quantity: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const aggregateBucket = (
      label: string,
      dateStr: string,
      start: Date,
      end: Date,
      isInclusiveEnd = false
    ): ChartDataPoint => {
      const startMs = start.getTime();
      const endMs = end.getTime();
      const bucketOrders = rawOrdersForChart.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return isInclusiveEnd ? t >= startMs && t <= endMs : t >= startMs && t < endMs;
      });

      const revenue = bucketOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      const productCounts: Record<string, number> = {};
      bucketOrders.forEach((o) => {
        o.items?.forEach((it) => {
          if (it.product_name_snapshot) {
            productCounts[it.product_name_snapshot] =
              (productCounts[it.product_name_snapshot] || 0) + (it.quantity || 1);
          }
        });
      });

      let topProduct: string | undefined = undefined;
      let maxSold = 0;
      for (const [pName, qty] of Object.entries(productCounts)) {
        if (qty > maxSold) {
          maxSold = qty;
          topProduct = pName;
        }
      }

      return {
        date: dateStr,
        label,
        revenue,
        orders: bucketOrders.length,
        topProduct,
      };
    };

    if (period === "today") {
      const currentHour = now.getHours();
      if (currentHour < 4) {
        const hours = Array.from({ length: Math.max(2, currentHour + 1) }, (_, i) => i);
        hours.forEach((h, idx) => {
          const slotStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate(), h, 0, 0, 0);
          const isLast = idx === hours.length - 1;
          const slotEnd = isLast ? now : new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate(), h + 1, 0, 0, 0);
          const timeLabel = slotStart.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
          const label = isLast ? `Now (${timeLabel})` : timeLabel;
          chartData.push(aggregateBucket(label, timeLabel, slotStart, slotEnd, isLast));
        });
      } else {
        const numPoints = 6;
        const hourStep = currentHour / (numPoints - 1);
        for (let i = 0; i < numPoints; i++) {
          const targetHour = Math.min(currentHour, Math.round(i * hourStep));
          const ptDate = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate(), targetHour, 0, 0, 0);
          const timeLabel = ptDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

          const startH = i === 0 ? 0 : (i - 0.5) * hourStep;
          const endH = i === numPoints - 1 ? 24 : (i + 0.5) * hourStep;
          const slotStart = new Date(todayStart.getTime() + Math.round(startH * 3600000));
          const slotEnd = i === numPoints - 1 ? now : new Date(todayStart.getTime() + Math.round(endH * 3600000));

          const isLast = i === numPoints - 1;
          const label = isLast ? `Now (${timeLabel})` : timeLabel;
          chartData.push(aggregateBucket(label, timeLabel, slotStart, slotEnd, isLast));
        }
      }
    } else if (period === "this_week") {
      const day = now.getDay();
      const dayIndex = day === 0 ? 6 : day - 1; // 0 for Mon ... 6 for Sun
      const daysCount = dayIndex + 1; // up to today

      if (daysCount === 1) {
        const slots = [
          { label: "06:00 AM", startH: 0, endH: 6 },
          { label: "12:00 PM", startH: 6, endH: 12 },
          { label: "04:00 PM", startH: 12, endH: 16 },
          { label: `Now (${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })})`, startH: 16, endH: 24 },
        ];
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i];
          const sStart = new Date(todayStart.getTime() + slot.startH * 3600000);
          const sEnd = i === slots.length - 1 ? now : new Date(todayStart.getTime() + slot.endH * 3600000);
          chartData.push(aggregateBucket(slot.label, slot.label, sStart, sEnd, i === slots.length - 1));
        }
      } else {
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        for (let i = 0; i < daysCount; i++) {
          const dayDate = new Date(periodStart);
          dayDate.setDate(dayDate.getDate() + i);
          const isToday = i === daysCount - 1;
          const slotStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
          const slotEnd = isToday ? now : new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
          const dayName = dayNames[i];
          const dateStr = dayDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
          const label = isToday ? `${dayName} (${dateStr} - Today)` : `${dayName}, ${dateStr}`;
          chartData.push(aggregateBucket(label, dateStr, slotStart, slotEnd, true));
        }
      }
    } else if (period === "this_month") {
      const currentDay = now.getDate();
      for (let d = 1; d <= currentDay; d++) {
        const dayDate = new Date(now.getFullYear(), now.getMonth(), d);
        const isToday = d === currentDay;
        const slotStart = new Date(now.getFullYear(), now.getMonth(), d, 0, 0, 0, 0);
        const slotEnd = isToday ? now : new Date(now.getFullYear(), now.getMonth(), d, 23, 59, 59, 999);
        const dateStr = dayDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        const label = isToday ? `${dateStr} (Today)` : dateStr;
        chartData.push(aggregateBucket(label, dateStr, slotStart, slotEnd, true));
      }
    } else if (period === "last_month") {
      const lastDayOfMonth = new Date(periodEnd).getDate();
      for (let d = 1; d <= lastDayOfMonth; d++) {
        const dayDate = new Date(periodStart.getFullYear(), periodStart.getMonth(), d);
        const slotStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), d, 0, 0, 0, 0);
        const slotEnd = new Date(periodStart.getFullYear(), periodStart.getMonth(), d, 23, 59, 59, 999);
        const dateStr = dayDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        chartData.push(aggregateBucket(dateStr, dateStr, slotStart, slotEnd, true));
      }
    } else if (period === "this_year") {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthNamesFull = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      for (let m = 0; m <= currentMonth; m++) {
        const monthStart = new Date(currentYear, m, 1, 0, 0, 0, 0);
        const monthEnd = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);
        const monthShort = monthNamesShort[m];
        const monthFull = monthNamesFull[m];
        const isCurrent = m === currentMonth;
        const label = isCurrent ? `${monthFull} (Current Month)` : `${monthFull} ${currentYear}`;
        const slotEnd = isCurrent ? now : monthEnd;
        chartData.push(aggregateBucket(label, monthShort, monthStart, slotEnd, true));
      }
    } else {
      const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (24 * 3600 * 1000)));
      const daysCount = Math.min(totalDays, 60);
      for (let i = 0; i < daysCount; i++) {
        const dayDate = new Date(periodStart.getTime() + i * 24 * 3600 * 1000);
        const isLast = i === daysCount - 1;
        const slotStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
        const slotEnd = isLast ? now : new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
        const dateStr = dayDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        const label = isLast ? `${dateStr} (Today)` : dateStr;
        chartData.push(aggregateBucket(label, dateStr, slotStart, slotEnd, true));
      }
    }

    // Mark peak revenue point
    const maxRevenue = Math.max(...chartData.map((c) => c.revenue));
    if (maxRevenue > 0) {
      const peak = chartData.find((c) => c.revenue === maxRevenue);
      if (peak) peak.isPeak = true;
    }
  } catch {
    const days = ["W1", "W2", "W3", "W4"];
    for (const d of days) {
      chartData.push({ date: d, label: d, revenue: 0, orders: 0 });
    }
  }

  // 7. Overview KPIs
  const averageOrderValue =
    periodOrdersCount > 0
      ? Math.round((currentRevenue / periodOrdersCount) * 100) / 100
      : 0;

  const prevAov =
    prevPeriodOrdersCount > 0
      ? Math.round((prevRevenue / prevPeriodOrdersCount) * 100) / 100
      : 0;

  const aovDiff = Math.round(averageOrderValue - prevAov);
  const aovComparisonText =
    prevAov > 0
      ? `${aovDiff >= 0 ? "+" : "-"}₹${Math.abs(aovDiff)} vs previous period`
      : periodOrdersCount > 0
      ? `Based on ${periodOrdersCount} orders`
      : "No order data for period";

  const aovTrend: "up" | "down" | "neutral" =
    prevAov > 0 ? (aovDiff >= 0 ? "up" : "down") : periodOrdersCount > 0 ? "up" : "neutral";

  const returnRtoRatePercent =
    periodOrdersCount > 0
      ? Math.round((cancelledOrdersCount / periodOrdersCount) * 1000) / 10
      : 0;

  const grossMarginPercent = 32.5;
  const grossMarginTrend: "up" | "down" | "neutral" = revenueGrowthPercent >= 0 ? "up" : "down";
  const grossMarginLabel = grossMarginTrend === "up" ? "Catalog Healthy & Stable" : "Below Target Range";

  return {
    stats: {
      totalProducts: totalProductsCount,
      productsBadgeText: `${totalProductsCount} catalog items active`,
      totalCategories: totalCategoriesCount,
      categoriesBadgeText: `${totalCategoriesCount} categories`,
      totalCustomers: totalCustomersCount,
      customerGrowthPercent,
      totalOrders: periodOrdersCount || allTimeOrdersCount,
      fulfillmentRatePercent,
      grossRevenue: currentRevenue,
      totalRevenue: currentRevenue,
      revenueGrowthPercent,
      pendingOrders: pendingOrdersCount,
      pendingOrdersNotice:
        pendingOrdersCount > 0
          ? `${pendingOrdersCount} orders pending processing`
          : "All orders dispatched",
      stockWarnings: lowStockCount,
      lowStock: lowStockCount,
      stockWarningsNotice:
        lowStockCount > 0
          ? `${lowStockCount} items below safety reorder level`
          : "Inventory levels optimal",
      todayOrders: todayOrdersCount,
      todayRevenue,
      todayAvgComparison,
    },
    overview: {
      averageOrderValue,
      aovComparisonText,
      aovTrend,
      grossMarginPercent,
      grossMarginLabel,
      grossMarginTrend,
      returnRtoRatePercent,
      returnRtoComparisonText: `${cancelledOrdersCount} cancelled/returned of ${periodOrdersCount || 1} orders`,
    },
    chartData,
    pipeline,
    pipelineHealth: {
      successRate,
      hubSla,
    },
    topProducts,
    recentOrders,
    restockAlerts,
  };
}
