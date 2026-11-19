import { db } from "@/lib/db/prisma";
import {
  ReportPeriod,
  CustomersReportResponse,
  CustomerReportRow,
  CustomersSummary,
} from "../types";
import { resolveReportDateRange } from "../utils/date-ranges";

export interface CustomersReportFilter {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
}

export async function getCustomersReport(
  filter: CustomersReportFilter = {}
): Promise<CustomersReportResponse> {
  const period = filter.period || "this_month";
  const { startDate, endDate, startIso, endIso } = resolveReportDateRange(
    period,
    filter.startDate,
    filter.endDate
  );

  // 1. Fetch users with their orders and address
  const users = await db.user.findMany({
    where: {
      deleted_at: null,
      is_active: true,
      orders: {
        some: {
          is_active: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      createdAt: true,
      addresses: {
        take: 1,
        select: {
          city: true,
          state: true,
        },
      },
      orders: {
        where: {
          is_active: true,
          order_status: { notIn: ["cancelled"] },
        },
        select: {
          totalAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    take: filter.limit || 500,
  });

  let totalPeriodSpent = 0;
  let newCustomersInPeriod = 0;
  let repeatCustomersInPeriod = 0;
  let totalLifetimeSpent = 0;

  const table: CustomerReportRow[] = [];

  for (const user of users) {
    const isRegisteredInPeriod = user.createdAt >= startDate && user.createdAt <= endDate;
    if (isRegisteredInPeriod) {
      newCustomersInPeriod += 1;
    }

    // Filter orders within period
    const periodOrders = user.orders.filter(
      (o: { createdAt: Date; totalAmount: any }) =>
        o.createdAt >= startDate && o.createdAt <= endDate
    );
    const ordersInPeriod = periodOrders.length;
    const spentInPeriod = periodOrders.reduce(
      (sum: number, o: { totalAmount: any }) => sum + Number(o.totalAmount || 0),
      0
    );

    // Lifetime metrics
    const lifetimeOrders = user.orders.length;
    const lifetimeSpent = user.orders.reduce(
      (sum: number, o: { totalAmount: any }) => sum + Number(o.totalAmount || 0),
      0
    );

    totalPeriodSpent += spentInPeriod;
    totalLifetimeSpent += lifetimeSpent;

    if (ordersInPeriod > 1 || (ordersInPeriod > 0 && lifetimeOrders > 1)) {
      repeatCustomersInPeriod += 1;
    }

    let customerType: CustomerReportRow["customerType"] = "one-time";
    if (isRegisteredInPeriod) {
      customerType = "new";
    } else if (lifetimeOrders > 1) {
      customerType = "repeat";
    }

    const addr = user.addresses[0];
    const lastOrderDate = user.orders[0]?.createdAt
      ? user.orders[0].createdAt.toISOString()
      : "—";

    // Apply search filter if provided
    if (filter.search && filter.search.trim()) {
      const term = filter.search.trim().toLowerCase();
      const match =
        (user.name && user.name.toLowerCase().includes(term)) ||
        (user.phone && user.phone.includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (addr?.city && addr.city.toLowerCase().includes(term));
      if (!match) continue;
    }

    table.push({
      id: user.id.toString(),
      name: user.name || "Customer",
      phone: user.phone || "—",
      email: user.email || "—",
      city: addr?.city || "—",
      state: addr?.state || "—",
      registeredAt: user.createdAt.toISOString(),
      ordersInPeriod,
      spentInPeriod: Math.round(spentInPeriod * 100) / 100,
      lifetimeOrders,
      lifetimeSpent: Math.round(lifetimeSpent * 100) / 100,
      averageOrderValue:
        lifetimeOrders > 0
          ? Math.round((lifetimeSpent / lifetimeOrders) * 100) / 100
          : 0,
      lastOrderDate,
      customerType,
    });
  }

  // Sort by spentInPeriod descending, then lifetimeSpent descending
  table.sort((a, b) => b.spentInPeriod - a.spentInPeriod || b.lifetimeSpent - a.lifetimeSpent);

  const totalCustomers = table.length;
  const avgLifetimeSpend =
    totalCustomers > 0
      ? Math.round((totalLifetimeSpent / totalCustomers) * 100) / 100
      : 0;

  const summary: CustomersSummary = {
    totalCustomers,
    newCustomersInPeriod,
    repeatCustomersInPeriod,
    totalSpentInPeriod: Math.round(totalPeriodSpent * 100) / 100,
    averageCustomerLifetimeSpend: avgLifetimeSpend,
  };

  return {
    period,
    dateRange: { start: startIso, end: endIso },
    summary,
    table,
  };
}
