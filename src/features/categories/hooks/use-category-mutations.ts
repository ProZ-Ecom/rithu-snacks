"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryKeys, productKeys, variantKeys } from "@/lib/api/query-keys";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  bulkDeleteCategories,
} from "../api/get-categories";

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createCategory(data),
    meta: { successMessage: "Category created successfully" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["customer", "catalog"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Record<string, unknown> }) =>
      updateCategory(id as number, data),
    meta: { successMessage: "Category updated successfully" },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["customer", "catalog"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteCategory(id as number),
    meta: { skipToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: variantKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "variants"] });
      queryClient.invalidateQueries({ queryKey: ["customer", "catalog"] });
    },
  });
}

export function useBulkDeleteCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: (number | string)[]) =>
      bulkDeleteCategories(
        ids.filter((id) => id !== null && id !== undefined && id !== "")
      ),
    meta: { skipToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: variantKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "variants"] });
      queryClient.invalidateQueries({ queryKey: ["customer", "catalog"] });
    },
  });
}


