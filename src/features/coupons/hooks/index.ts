"use client";

import { useQuery } from "@tanstack/react-query";
import { couponKeys } from "@/lib/api/query-keys";
import { getCoupons, getCoupon } from "../api/get-coupons";
import type { GetCouponsParams } from "../types";

export function useCoupons(params?: GetCouponsParams) {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.search) queryParams.search = params.search;
  if (params?.isActive !== undefined) queryParams.isActive = params.isActive;

  return useQuery({
    queryKey: couponKeys.list(queryParams),
    queryFn: () => getCoupons(queryParams),
  });
}

export function useCoupon(id: number | null) {
  return useQuery({
    queryKey: couponKeys.detail(id ?? ""),
    queryFn: () => getCoupon(id!),
    enabled: id !== null,
  });
}

export { getCoupons, getCoupon } from "../api/get-coupons";
export { useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from "./use-coupon-mutations";
