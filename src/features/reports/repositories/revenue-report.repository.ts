import { db } from "@/lib/db/prisma";
import {
  ReportPeriod,
  RevenueReportResponse,
  RevenueSummary,
  PaymentGatewaySplit,
  RevenueTableRow,
} from "../types";
import { resolveReportDateRange } from "../utils/date-ranges";

export async function getRevenueReport(
  period: ReportPeriod = "this_month",
  customStart?: string,
  customEnd?: string
): Promise<RevenueReportResponse> {
  const { startDate, endDate, startIso, endIso } = resolveReportDateRange(
    period,
    customStart,
    customEnd
  );

  // Fetch valid completed/processing orders (excluding cancelled)
  const orders = await db.order.findMany({
    where: {
      is_active: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      order_status: {
        not: "cancelled",
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
      payments: {
        select: {
          amount: true,
          gateway: true,
          payment_methods: {
            select: {
              name: true,
            },
          },
        },
      },
      refunds: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let grossInvoiced = 0;
  let discountsGranted = 0;
  let taxableBase = 0;
  let totalTaxCollected = 0;
  let totalShippingCollected = 0;
  let netRevenue = 0;
  let refundsIssued = 0;

  const gatewayMap: Record<string, { amount: number; count: number; label: string }> = {};
  const dateMap: Record<
    string,
    {
      ordersCount: number;
      grossAmount: number;
      discountAmount: number;
      taxableAmount: number;
      taxAmount: number;
      shippingAmount: number;
      netRevenue: number;
    }
  > = {};

  for (const order of orders) {
    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discountAmount || 0);
    const tax = Number(order.taxAmount || 0);
    const shipping = Number(order.shipping_charge || 0);
    const net = Number(order.totalAmount || 0);
    const gross = subtotal + tax + shipping;

    const refund = order.refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    grossInvoiced += gross;
    discountsGranted += discount;
    taxableBase += subtotal;
    totalTaxCollected += tax;
    totalShippingCollected += shipping;
    netRevenue += net;
    refundsIssued += refund;

    // Payment gateway tracking
    for (const p of order.payments) {
      const gw = (p.payment_methods?.name || p.gateway || "Online").toUpperCase();
      if (!gatewayMap[gw]) {
        gatewayMap[gw] = { amount: 0, count: 0, label: gw };
      }
      gatewayMap[gw].amount += Number(p.amount || 0);
      gatewayMap[gw].count += 1;
    }

    // Daily grouping
    const dateKey = order.createdAt.toISOString().split("T")[0];
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        ordersCount: 0,
        grossAmount: 0,
        discountAmount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        netRevenue: 0,
      };
    }

    dateMap[dateKey].ordersCount += 1;
    dateMap[dateKey].grossAmount += gross;
    dateMap[dateKey].discountAmount += discount;
    dateMap[dateKey].taxableAmount += subtotal;
    dateMap[dateKey].taxAmount += tax;
    dateMap[dateKey].shippingAmount += shipping;
    dateMap[dateKey].netRevenue += net;
  }

  // Format Gateway Split with percentages
  const paymentSplit: PaymentGatewaySplit[] = Object.keys(gatewayMap).map((gw) => {
    const entry = gatewayMap[gw];
    return {
      gateway: gw,
      label: entry.label,
      amount: Math.round(entry.amount * 100) / 100,
      count: entry.count,
      sharePercent:
        netRevenue > 0 ? Math.round((entry.amount / netRevenue) * 1000) / 10 : 0,
    };
  });
  paymentSplit.sort((a, b) => b.amount - a.amount);

  // Format Table
  const sortedDates = Object.keys(dateMap).sort();
  const table: RevenueTableRow[] = sortedDates.map((date) => {
    const entry = dateMap[date];
    return {
      periodDate: date,
      ordersCount: entry.ordersCount,
      grossAmount: Math.round(entry.grossAmount * 100) / 100,
      discountAmount: Math.round(entry.discountAmount * 100) / 100,
      taxableAmount: Math.round(entry.taxableAmount * 100) / 100,
      taxAmount: Math.round(entry.taxAmount * 100) / 100,
      shippingAmount: Math.round(entry.shippingAmount * 100) / 100,
      netRevenue: Math.round(entry.netRevenue * 100) / 100,
    };
  });

  const summary: RevenueSummary = {
    grossInvoiced: Math.round(grossInvoiced * 100) / 100,
    discountsGranted: Math.round(discountsGranted * 100) / 100,
    taxableBase: Math.round(taxableBase * 100) / 100,
    totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
    totalShippingCollected: Math.round(totalShippingCollected * 100) / 100,
    netRevenue: Math.round(netRevenue * 100) / 100,
    refundsIssued: Math.round(refundsIssued * 100) / 100,
  };

  return {
    period,
    dateRange: { start: startIso, end: endIso },
    summary,
    paymentSplit,
    table,
  };
}
