"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { offerKeys } from "@/lib/api/query-keys";
import {
  getApplicableOffer,
  getOffer,
  getOfferItemTargets,
  getOfferProductTargets,
  getOfferCategoryOptions,
  getOffers,
  getOffersForItem,
  getOffersForProduct,
} from "../api/get-offers";
import type { GetOffersParams } from "../types";

export function useOffers(params?: GetOffersParams) {
  return useQuery({
    queryKey: offerKeys.list(params as Record<string, unknown>),
    queryFn: () => getOffers(params),
    // Keeps the table populated while a new page or filter loads, so the rows
    // don't collapse to a skeleton on every keystroke of the debounced search.
    placeholderData: keepPreviousData,
  });
}

export function useOffer(id: string | null) {
  return useQuery({
    queryKey: offerKeys.detail(id ?? ""),
    queryFn: () => getOffer(id!),
    enabled: !!id,
  });
}

/** Categories keyed by UUID, for the offer filters and form. */
export function useOfferCategories() {
  return useQuery({
    queryKey: ["offers", "targets", "categories"],
    queryFn: () => getOfferCategoryOptions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOfferProductTargets(params: {
  categoryId?: string;
  search?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["offers", "targets", "products", params.categoryId, params.search],
    queryFn: () =>
      getOfferProductTargets({ categoryId: params.categoryId, search: params.search }),
    enabled: params.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useOfferItemTargets(params: {
  productId?: string;
  categoryId?: string;
  search?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["offers", "targets", "items", params.productId, params.categoryId, params.search],
    queryFn: () =>
      getOfferItemTargets({
        productId: params.productId,
        categoryId: params.categoryId,
        search: params.search,
      }),
    // Without a parent product the item list would be the whole catalog.
    enabled: (params.enabled ?? true) && Boolean(params.productId || params.search),
    placeholderData: keepPreviousData,
  });
}

export function useProductOffers(productId: string | null) {
  return useQuery({
    queryKey: ["offers", "by-product", productId],
    queryFn: () => getOffersForProduct(productId!),
    enabled: !!productId,
  });
}

export function useItemOffers(itemId: string | null) {
  return useQuery({
    queryKey: ["offers", "by-item", itemId],
    queryFn: () => getOffersForItem(itemId!),
    enabled: !!itemId,
  });
}

export function useApplicableOffer(
  itemId: string | null,
  params?: { quantity?: number; cartValue?: number }
) {
  return useQuery({
    queryKey: ["offers", "applicable", itemId, params?.quantity, params?.cartValue],
    queryFn: () => getApplicableOffer(itemId!, params),
    enabled: !!itemId,
  });
}

export {
  useCreateOffer,
  useUpdateOffer,
  useToggleOfferStatus,
  useDeleteOffer,
} from "./use-offer-mutations";
export { getOffers } from "../api/get-offers";
