"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { deliveryKeys, orderKeys, adminOrderKeys } from "@/lib/api/query-keys";
import {
  getStaffDeliveries,
  getStaffDeliveryByUuid,
  getStaffDeliveriesCount,
  acceptDelivery,
  rejectDelivery,
  markOutForDelivery,
  markDelivered,
  markFailed,
  getAdminDeliveryOrders,
  getAdminDeliveryStaff,
  assignDelivery,
} from "../api/delivery.api";
import type {
  StaffDeliveryListInput,
  MarkDeliveredInput,
  MarkFailedInput,
  RejectDeliveryInput,
  AdminDeliveryOrdersListInput,
  AdminDeliveryStaffListInput,
  AssignDeliveryInput,
} from "../validations/delivery.schema";
import type {
  StaffDeliveryDetailResponse,
  AssignDeliveryResult,
  DeliveryTransitionResult,
  StaffDeliveriesCountResponse,
} from "../types/delivery.types";

/* ----------------------- Staff Delivery Queries & Mutations ----------------------- */

export function useStaffDeliveries(params?: StaffDeliveryListInput) {
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  const queryParams: Record<string, string | number | undefined> = {
    page,
    limit,
    status: params?.status,
    search: params?.search,
    sortBy: params?.sortBy ?? "createdAt",
    sortOrder: params?.sortOrder ?? "desc",
  };

  return useQuery({
    queryKey: deliveryKeys.list(queryParams),
    queryFn: () => getStaffDeliveries(params),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
}

export function useStaffDeliveriesCount(params?: Partial<StaffDeliveryListInput>) {
  const queryParams: Record<string, string | number | undefined> = {
    status: params?.status,
    search: params?.search,
  };

  return useQuery<StaffDeliveriesCountResponse>({
    queryKey: [...deliveryKeys.all, "staff-count", queryParams] as const,
    queryFn: () => getStaffDeliveriesCount(params),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
}

export function useStaffDelivery(uuid: string | null) {
  return useQuery({
    queryKey: deliveryKeys.detail(uuid ?? ""),
    queryFn: () => getStaffDeliveryByUuid(uuid!),
    enabled: Boolean(uuid),
    staleTime: 15 * 1000,
  });
}

export function useAcceptDelivery() {
  const queryClient = useQueryClient();

  return useMutation<{
    id: string;
    status: string;
    assignmentStatus: string;
    acceptedAt: Date | string | null;
  }, Error, string>({
    mutationFn: (uuid: string) => acceptDelivery(uuid),
    meta: {
      successMessage: "Delivery accepted successfully.",
      errorMessage: "Failed to accept delivery",
    },
    onSuccess: (_result, uuid) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(uuid) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
    },
  });
}

export function useRejectDelivery() {
  const queryClient = useQueryClient();

  return useMutation<{
    id: string;
    status: string;
    assignmentStatus: string;
    reason: string;
  }, Error, { uuid: string; data: RejectDeliveryInput }>({
    mutationFn: ({ uuid, data }) => rejectDelivery(uuid, data),
    meta: {
      successMessage: "Delivery assignment rejected.",
      errorMessage: "Failed to reject delivery",
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(variables.uuid) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
    },
  });
}

export function useMarkOutForDelivery() {
  const queryClient = useQueryClient();

  return useMutation<DeliveryTransitionResult, Error, string>({
    mutationFn: (uuid: string) => markOutForDelivery(uuid),
    meta: {
      successMessage: "Order marked as Out for Delivery.",
      errorMessage: "Failed to update delivery status",
    },
    onSuccess: (_result, uuid) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(uuid) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
    },
  });
}

export function useMarkDelivered() {
  const queryClient = useQueryClient();

  return useMutation<
    DeliveryTransitionResult,
    Error,
    { uuid: string; data?: MarkDeliveredInput }
  >({
    mutationFn: ({ uuid, data }) => markDelivered(uuid, data),
    meta: {
      successMessage: "Order marked as Delivered successfully.",
      errorMessage: "Failed to mark order as delivered",
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(variables.uuid) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
    },
  });
}

export function useMarkFailed() {
  const queryClient = useQueryClient();

  return useMutation<
    DeliveryTransitionResult,
    Error,
    { uuid: string; data?: MarkFailedInput }
  >({
    mutationFn: ({ uuid, data }) => markFailed(uuid, data),
    meta: {
      successMessage: "Order marked as Failed.",
      errorMessage: "Failed to mark order as failed",
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(variables.uuid) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
    },
  });
}

/* ----------------------- Admin Delivery Queries & Mutations ----------------------- */

export function useAdminDeliveryOrders(params?: AdminDeliveryOrdersListInput) {
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  const queryParams: Record<string, string | number | undefined> = {
    page,
    limit,
    orderStatus: params?.orderStatus,
    deliveryStatus: params?.deliveryStatus,
    staffId: params?.staffId,
    search: params?.search,
    sortBy: params?.sortBy ?? "createdAt",
    sortOrder: params?.sortOrder ?? "desc",
  };

  return useQuery({
    queryKey: [...deliveryKeys.all, "admin-orders", queryParams] as const,
    queryFn: () => getAdminDeliveryOrders(params),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
}

export function useAdminDeliveryStaff(params?: AdminDeliveryStaffListInput) {
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 20;

  const queryParams: Record<string, string | number | boolean | undefined> = {
    page,
    limit,
    search: params?.search,
    isActive: params?.isActive,
    sortBy: params?.sortBy ?? "name",
    sortOrder: params?.sortOrder ?? "asc",
  };

  return useQuery({
    queryKey: [...deliveryKeys.all, "admin-staff", queryParams] as const,
    queryFn: () => getAdminDeliveryStaff(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useAssignDelivery() {
  const queryClient = useQueryClient();

  return useMutation<AssignDeliveryResult, Error, AssignDeliveryInput>({
    mutationFn: (input: AssignDeliveryInput) => assignDelivery(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
    },
  });
}

export {
  getStaffDeliveries,
  getAdminDeliveryOrders,
  getStaffDeliveryByUuid,
  getAdminDeliveryStaff,
} from "../api/delivery.api";
