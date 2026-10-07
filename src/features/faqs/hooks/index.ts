"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/Toast";
import { faqApi } from "../api/faq.api";
export { faqApi };
import type {
  CreateFaqPayload,
  UpdateFaqPayload,
  FaqListQueryInput,
  PublicFaqQueryInput,
  UpdateFaqOrderInput,
  UpdateFaqStatusInput,
} from "../validations/faq.schema";

export const FAQ_KEYS = {
  all: ["faqs"] as const,
  lists: () => [...FAQ_KEYS.all, "list"] as const,
  list: (params?: FaqListQueryInput) =>
    [...FAQ_KEYS.lists(), params] as const,
  details: () => [...FAQ_KEYS.all, "detail"] as const,
  detail: (id: string) => [...FAQ_KEYS.details(), id] as const,
  categories: () => [...FAQ_KEYS.all, "categories"] as const,
  public: (params?: PublicFaqQueryInput) =>
    [...FAQ_KEYS.all, "public", params] as const,
};

/** Storefront FAQ page — active FAQs, already sorted by display order. */
export function usePublicFaqs(
  params?: PublicFaqQueryInput,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: FAQ_KEYS.public(params),
    queryFn: () => faqApi.getFaqs(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useAdminFaqs(
  params?: FaqListQueryInput,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: FAQ_KEYS.list(params),
    queryFn: () => faqApi.getAdminFaqs(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useFaq(id: string | null) {
  return useQuery({
    queryKey: FAQ_KEYS.detail(id ?? ""),
    queryFn: () => faqApi.getFaqById(id!),
    enabled: !!id,
  });
}

export function useFaqCategories() {
  return useQuery({
    queryKey: FAQ_KEYS.categories(),
    queryFn: () => faqApi.getFaqCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFaqPayload) => faqApi.createFaq(data),
    meta: { skipToast: true },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: FAQ_KEYS.all });
      toast.success("Success", result.message || "FAQ created successfully");
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "Failed to create FAQ");
    },
  });
}

export function useUpdateFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFaqPayload }) =>
      faqApi.updateFaq(id, data),
    meta: { skipToast: true },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: FAQ_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: FAQ_KEYS.detail(variables.id),
      });
      toast.success("Success", result.message || "FAQ updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "Failed to update FAQ");
    },
  });
}

export function useDeleteFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => faqApi.deleteFaq(id),
    meta: { skipToast: true },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: FAQ_KEYS.all });
      toast.success("Success", result.message || "FAQ deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "Failed to delete FAQ");
    },
  });
}

export function useUpdateFaqStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFaqStatusInput }) =>
      faqApi.updateFaqStatus(id, data),
    meta: { skipToast: true },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: FAQ_KEYS.all });
      toast.success("Success", result.message || "FAQ status updated");
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "Failed to update FAQ status");
    },
  });
}

export function useUpdateFaqOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFaqOrderInput) => faqApi.updateFaqOrder(data),
    meta: { skipToast: true },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: FAQ_KEYS.all });
      toast.success("Success", result.message || "FAQ order updated");
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "Failed to update FAQ order");
    },
  });
}
