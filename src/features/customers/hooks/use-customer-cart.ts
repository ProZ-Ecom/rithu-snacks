"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  customerCartApi,
  type AddCartItemPayload,
} from "../api/customer-cart.api";

export const CUSTOMER_CART_QUERY_KEY = ["customer", "cart"] as const;

export function useCustomerCart(options?: { enabled?: boolean }) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return useQuery({
    queryKey: CUSTOMER_CART_QUERY_KEY,
    queryFn: () => customerCartApi.getCart(),
    staleTime: 1000 * 30, // 30 seconds
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

export function useCustomerCartCount(options?: { enabled?: boolean }) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return useQuery({
    queryKey: [...CUSTOMER_CART_QUERY_KEY, "count"],
    queryFn: () => customerCartApi.getCartCount(),
    staleTime: 0,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddCartItemPayload) =>
      customerCartApi.addItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["customer", "wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useUpdateCartQuantityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      variantUuid,
      quantity,
    }: {
      variantUuid: string;
      quantity: number;
    }) => customerCartApi.updateQuantity(variantUuid, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variantUuid: string) =>
      customerCartApi.removeItem(variantUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => customerCartApi.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useApplyCouponMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => customerCartApi.applyCoupon(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveCouponMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => customerCartApi.removeCoupon(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}
