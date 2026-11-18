import { apiClient } from "@/lib/api/api-client";
import {
  SalesReportResponse,
  OrdersReportResponse,
  ProductsReportResponse,
  InventoryReportResponse,
  RevenueReportResponse,
  CustomersReportResponse,
  ReportPeriod,
} from "../types";

export interface DateFilterQuery {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
}

export async function fetchSalesReport(
  params: DateFilterQuery = {}
): Promise<SalesReportResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);

  const res = await apiClient.get<SalesReportResponse>(
    `/api/admin/reports/sales?${query.toString()}`
  );
  return res.data!;
}

export async function fetchOrdersReport(
  params: DateFilterQuery & {
    status?: string;
    paymentStatus?: string;
    search?: string;
    limit?: number;
  } = {}
): Promise<OrdersReportResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.status) query.set("status", params.status);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params.search) query.set("search", params.search);
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await apiClient.get<OrdersReportResponse>(
    `/api/admin/reports/orders?${query.toString()}`
  );
  return res.data!;
}

export async function fetchProductsReport(
  params: DateFilterQuery & { categoryId?: string; search?: string } = {}
): Promise<ProductsReportResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.search) query.set("search", params.search);

  const res = await apiClient.get<ProductsReportResponse>(
    `/api/admin/reports/products?${query.toString()}`
  );
  return res.data!;
}

export async function fetchInventoryReport(params: {
  stockStatus?: "all" | "in_stock" | "low_stock" | "out_of_stock";
  search?: string;
} = {}): Promise<InventoryReportResponse> {
  const query = new URLSearchParams();
  if (params.stockStatus) query.set("stockStatus", params.stockStatus);
  if (params.search) query.set("search", params.search);

  const res = await apiClient.get<InventoryReportResponse>(
    `/api/admin/reports/inventory?${query.toString()}`
  );
  return res.data!;
}

export async function fetchRevenueReport(
  params: DateFilterQuery = {}
): Promise<RevenueReportResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);

  const res = await apiClient.get<RevenueReportResponse>(
    `/api/admin/reports/revenue?${query.toString()}`
  );
  return res.data!;
}

export async function fetchCustomersReport(
  params: DateFilterQuery & { search?: string; limit?: number } = {}
): Promise<CustomersReportResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.search) query.set("search", params.search);
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await apiClient.get<CustomersReportResponse>(
    `/api/admin/reports/customers?${query.toString()}`
  );
  return res.data!;
}
