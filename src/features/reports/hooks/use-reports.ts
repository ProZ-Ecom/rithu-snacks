"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchSalesReport,
  fetchOrdersReport,
  fetchProductsReport,
  fetchInventoryReport,
  fetchRevenueReport,
  fetchCustomersReport,
  DateFilterQuery,
} from "../api";
import {
  SalesReportResponse,
  OrdersReportResponse,
  ProductsReportResponse,
  InventoryReportResponse,
  RevenueReportResponse,
  CustomersReportResponse,
} from "../types";

export function useSalesReport(filters: DateFilterQuery) {
  return useQuery<SalesReportResponse>({
    queryKey: ["reports", "sales", filters.period, filters.startDate, filters.endDate],
    queryFn: () => fetchSalesReport(filters),
    staleTime: 1000 * 60 * 3, // 3 mins cache
    refetchOnWindowFocus: false,
  });
}

export function useOrdersReport(
  filters: DateFilterQuery & {
    status?: string;
    paymentStatus?: string;
    search?: string;
    limit?: number;
  }
) {
  return useQuery<OrdersReportResponse>({
    queryKey: [
      "reports",
      "orders",
      filters.period,
      filters.startDate,
      filters.endDate,
      filters.status,
      filters.paymentStatus,
      filters.search,
    ],
    queryFn: () => fetchOrdersReport(filters),
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });
}

export function useProductsReport(
  filters: DateFilterQuery & { categoryId?: string; search?: string }
) {
  return useQuery<ProductsReportResponse>({
    queryKey: [
      "reports",
      "products",
      filters.period,
      filters.startDate,
      filters.endDate,
      filters.categoryId,
      filters.search,
    ],
    queryFn: () => fetchProductsReport(filters),
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });
}

export function useInventoryReport(filters: {
  stockStatus?: "all" | "in_stock" | "low_stock" | "out_of_stock";
  search?: string;
}) {
  return useQuery<InventoryReportResponse>({
    queryKey: ["reports", "inventory", filters.stockStatus, filters.search],
    queryFn: () => fetchInventoryReport(filters),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}

export function useRevenueReport(filters: DateFilterQuery) {
  return useQuery<RevenueReportResponse>({
    queryKey: ["reports", "revenue", filters.period, filters.startDate, filters.endDate],
    queryFn: () => fetchRevenueReport(filters),
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });
}

export function useCustomersReport(
  filters: DateFilterQuery & { search?: string; limit?: number }
) {
  return useQuery<CustomersReportResponse>({
    queryKey: [
      "reports",
      "customers",
      filters.period,
      filters.startDate,
      filters.endDate,
      filters.search,
    ],
    queryFn: () => fetchCustomersReport(filters),
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });
}
