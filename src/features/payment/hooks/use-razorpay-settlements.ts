"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type { RazorpayDashboardData } from "../services/razorpay-settlements.service";

export const RAZORPAY_SETTLEMENTS_QUERY_KEY = ["admin", "payments", "settlements"];

export function useRazorpaySettlements(days = 30) {
  return useQuery<RazorpayDashboardData>({
    queryKey: [...RAZORPAY_SETTLEMENTS_QUERY_KEY, days],
    queryFn: async () => {
      const response = await apiClient.get<RazorpayDashboardData>(
        `/api/admin/payments/settlements?days=${days}`
      );
      if (!response.data) {
        throw new Error(response.message || "Failed to fetch Razorpay settlements data");
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
