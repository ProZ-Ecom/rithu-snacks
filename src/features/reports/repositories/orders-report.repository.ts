import { db } from "@/lib/db/prisma";
import { ReportPeriod, OrdersReportResponse, OrderReportRow, OrderStatusCount } from "../types";
import { resolveReportDateRange } from "../utils/date-ranges";

export interface OrdersReportFilter {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentStatus?: string;
  search?: string;
  limit?: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export async function getOrdersReport(filter: OrdersReportFilter = {}): Promise<OrdersReportResponse> {
  const period = filter.period || "this_month";
  const { startDate, endDate, startIso, endIso } = resolveReportDateRange(
    period,
    filter.startDate,
    filter.endDate
  );

  // Build Prisma where clause
  const whereClause: any = {
    is_active: true,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filter.status && filter.status !== "all") {
    whereClause.order_status = filter.status;
  }

  if (filter.paymentStatus && filter.paymentStatus !== "all") {
    whereClause.payment_status = filter.paymentStatus;
  }

  if (filter.search && filter.search.trim()) {
    const term = filter.search.trim();
    whereClause.OR = [
      { orderNumber: { contains: term } },
      { user: { name: { contains: term } } },
      { user: { phone: { contains: term } } },
    ];
  }

  // Fetch orders with relations
  const orders = await db.order.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      address: {
        where: { type: "shipping" },
        take: 1,
        select: {
          city: true,
          state: true,
        },
      },
      payments: {
        take: 1,
        select: {
          gateway: true,
          payment_methods: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: { items: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: filter.limit || 500,
  });

  // Calculate status counts & summaries
  const statusCounts: Record<string, number> = {};
  let totalAmount = 0;
  let deliveredCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  let returnedCount = 0;

  const table: OrderReportRow[] = orders.map((order) => {
    const status = (order.order_status || "pending").toLowerCase();
    const amount = Number(order.totalAmount || 0);

    totalAmount += amount;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (status === "delivered") {
      deliveredCount += 1;
    } else if (status === "cancelled") {
      cancelledCount += 1;
    } else if (status === "returned") {
      returnedCount += 1;
    } else {
      pendingCount += 1;
    }

    const shippingAddress = order.address[0];
    const payment = order.payments[0];
    const paymentMethodName =
      payment?.payment_methods?.name || payment?.gateway || "Online";

    return {
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      placedAt: order.createdAt.toISOString(),
      customerName: order.user?.name || "Customer",
      customerPhone: order.user?.phone || "—",
      city: shippingAddress?.city || "—",
      state: shippingAddress?.state || "—",
      itemCount: order._count.items,
      paymentMethod: paymentMethodName,
      paymentStatus: (order.payment_status || "pending").toUpperCase(),
      orderStatus: order.order_status,
      totalAmount: amount,
    };
  });

  const totalOrders = orders.length;
  const fulfillmentRatePercent =
    totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 1000) / 10 : 0;

  // Build distribution array
  const statusDistribution: OrderStatusCount[] = Object.keys(statusCounts).map((statusKey) => {
    const count = statusCounts[statusKey];
    return {
      status: statusKey,
      label: STATUS_LABELS[statusKey] || statusKey,
      count,
      percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 1000) / 10 : 0,
    };
  });

  return {
    period,
    dateRange: { start: startIso, end: endIso },
    summary: {
      totalOrders,
      deliveredOrders: deliveredCount,
      pendingOrders: pendingCount,
      cancelledOrders: cancelledCount,
      returnedOrders: returnedCount,
      fulfillmentRatePercent,
      totalAmount: Math.round(totalAmount * 100) / 100,
    },
    statusDistribution,
    table,
    totalRecords: totalOrders,
  };
}
