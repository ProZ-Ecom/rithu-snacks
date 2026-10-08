"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartKeys, orderKeys, adminOrderKeys, checkoutKeys, deliveryKeys } from "@/lib/api/query-keys";
import { toast } from "@/components/ui/Toast";
import {
  getOrders,
  getOrder,
  getOrderByNumber,
  placeOrder,
  cancelOrder,
  cancelOrderAdmin,
  getAdminOrders,
  getAdminOrdersCount,
  getAdminOrder,
  confirmAdminOrder,
  processAdminOrder,
  packAdminOrder,
  assignOrderDelivery,
  getCheckoutSummary,
  getDeliveryPartners,
  shipOrderCourier,
  type AssignDeliveryInput,
  type ShipOrderCourierPayload,
} from "../api/get-orders";
import type {
  DeliveryMethod,
  GetOrdersParams,
  AdminOrdersListParams,
  PlaceOrderInput,
  UpdateOrderStatusInput,
} from "../types";

export function useOrders(params?: GetOrdersParams) {
  return useQuery({
    queryKey: orderKeys.list(
      params as Record<string, unknown> | undefined
    ),
    queryFn: () => getOrders(params),
  });
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? 0),
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });
}

export function useOrderByNumber(orderNumber: string | null) {
  return useQuery({
    queryKey: ["orders", "by-number", orderNumber ?? ""] as const,
    queryFn: () => getOrderByNumber(orderNumber!),
    enabled: !!orderNumber,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaceOrderInput) => placeOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: checkoutKeys.all });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      cancelOrder(id, { reason }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
    },
  });
}

export function useCancelOrderAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      reason,
      note,
    }: {
      id: string | number;
      reason?: string;
      note?: string;
    }) => cancelOrderAdmin(id, { reason, note }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin-orders", "count"] });
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export const useCancelAdminOrder = useCancelOrderAdmin;

export function useAdminOrders(params?: AdminOrdersListParams) {
  return useQuery({
    queryKey: adminOrderKeys.list(
      params as Record<string, unknown> | undefined
    ),
    queryFn: () => getAdminOrders(params),
  });
}

export function useAdminOrdersCount(params?: Partial<AdminOrdersListParams>) {
  return useQuery({
    queryKey: ["admin-orders", "count", params ?? {}] as const,
    queryFn: () => getAdminOrdersCount(params),
  });
}

export function useAdminOrder(id: string | number | null) {
  return useQuery({
    queryKey: adminOrderKeys.detail(id ?? ""),
    queryFn: () => getAdminOrder(id!),
    enabled: !!id,
  });
}

export function useConfirmAdminOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string | number; note?: string }) =>
      confirmAdminOrder(id, note),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin-orders", "count"] });
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.detail(variables.id),
      });
    },
  });
}

export function useProcessAdminOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string | number; note?: string }) =>
      processAdminOrder(id, note),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin-orders", "count"] });
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.detail(variables.id),
      });
    },
  });
}

export function usePackAdminOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string | number; note?: string }) =>
      packAdminOrder(id, note),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin-orders", "count"] });
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.detail(variables.id),
      });
    },
  });
}

export function useAssignOrderDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignDeliveryInput) => assignOrderDelivery(input),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin-orders", "count"] });
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.detail(variables.orderId),
      });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery"] });
      toast.success("Delivery staff assigned successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to assign delivery staff");
    },
  });
}

export function useCheckoutSummary(
  deliveryMethod: DeliveryMethod,
  couponCode: string | null
) {
  return useQuery({
    queryKey: checkoutKeys.list({ deliveryMethod, couponCode }),
    queryFn: () =>
      getCheckoutSummary({
        deliveryMethod,
        couponCode: couponCode ?? undefined,
      }),
  });
}

export function useDeliveryPartners() {
  return useQuery({
    queryKey: ["admin", "delivery-partners"],
    queryFn: () => getDeliveryPartners(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useShipOrderCourier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uuid,
      payload,
    }: {
      uuid: string | number;
      payload: ShipOrderCourierPayload;
    }) => shipOrderCourier(uuid, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin-orders", "count"] });
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.detail(variables.uuid),
      });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery"] });
      queryClient.invalidateQueries({ queryKey: ["customer", "orders"] });
      toast.success("Order shipped via courier successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to ship order via courier");
    },
  });
}


