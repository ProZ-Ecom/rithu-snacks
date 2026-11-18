import { db } from "@/lib/db/prisma";
import { ReportPeriod, SalesReportResponse, SalesTableRow, SalesChartPoint } from "../types";
import { resolveReportDateRange } from "../utils/date-ranges";

export async function getSalesReport(
  period: ReportPeriod = "this_month",
  customStart?: string,
  customEnd?: string
): Promise<SalesReportResponse> {
  const { startDate, endDate, startIso, endIso } = resolveReportDateRange(
    period,
    customStart,
    customEnd
  );

  // Fetch valid orders in range (excluding cancelled and returned for gross/net sales)
  const orders = await db.order.findMany({
    where: {
      is_active: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      order_status: {
        notIn: ["cancelled", "returned"],
      },
    },
    select: {
      id: true,
      subtotal: true,
      discountAmount: true,
      taxAmount: true,
      shipping_charge: true,
      totalAmount: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Calculate summary metrics
  let totalGross = 0;
  let totalNet = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalShipping = 0;
  let totalItemsSold = 0;

  // Group by date map: "YYYY-MM-DD"
  const dateMap: Record<
    string,
    {
      orderCount: number;
      itemsSold: number;
      grossSales: number;
      discountAmount: number;
      taxAmount: number;
      shippingAmount: number;
      netSales: number;
    }
  > = {};

  for (const order of orders) {
    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discountAmount || 0);
    const tax = Number(order.taxAmount || 0);
    const shipping = Number(order.shipping_charge || 0);
    const net = Number(order.totalAmount || 0);
    const gross = subtotal + tax + shipping;

    const itemsCount = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    totalGross += gross;
    totalNet += net;
    totalDiscount += discount;
    totalTax += tax;
    totalShipping += shipping;
    totalItemsSold += itemsCount;

    const dateKey = order.createdAt.toISOString().split("T")[0];
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        orderCount: 0,
        itemsSold: 0,
        grossSales: 0,
        discountAmount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        netSales: 0,
      };
    }

    dateMap[dateKey].orderCount += 1;
    dateMap[dateKey].itemsSold += itemsCount;
    dateMap[dateKey].grossSales += gross;
    dateMap[dateKey].discountAmount += discount;
    dateMap[dateKey].taxAmount += tax;
    dateMap[dateKey].shippingAmount += shipping;
    dateMap[dateKey].netSales += net;
  }

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? Math.round((totalNet / totalOrders) * 100) / 100 : 0;

  // Transform dateMap into table and chart arrays
  const sortedDates = Object.keys(dateMap).sort();
  const table: SalesTableRow[] = sortedDates.map((date) => {
    const entry = dateMap[date];
    return {
      date,
      orderCount: entry.orderCount,
      itemsSold: entry.itemsSold,
      grossSales: Math.round(entry.grossSales * 100) / 100,
      discountAmount: Math.round(entry.discountAmount * 100) / 100,
      taxAmount: Math.round(entry.taxAmount * 100) / 100,
      shippingAmount: Math.round(entry.shippingAmount * 100) / 100,
      netSales: Math.round(entry.netSales * 100) / 100,
    };
  });

  const chart: SalesChartPoint[] = sortedDates.map((date) => {
    const entry = dateMap[date];
    const dateObj = new Date(date);
    const label = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return {
      date,
      label,
      sales: Math.round(entry.netSales),
      orders: entry.orderCount,
    };
  });

  return {
    period,
    dateRange: { start: startIso, end: endIso },
    summary: {
      grossSales: Math.round(totalGross * 100) / 100,
      netSales: Math.round(totalNet * 100) / 100,
      totalOrders,
      averageOrderValue,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalShipping: Math.round(totalShipping * 100) / 100,
      totalItemsSold,
    },
    chart,
    table,
  };
}
