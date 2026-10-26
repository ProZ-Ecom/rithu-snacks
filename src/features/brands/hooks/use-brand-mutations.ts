"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { brandKeys } from "@/lib/api/query-keys";
import { createBrand, updateBrand, deleteBrand } from "../api/get-brands";

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createBrand(data),
    meta: { successMessage: "Brand created successfully" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: Record<string, unknown> }) =>
      updateBrand(uuid, data),
    meta: { successMessage: "Brand updated successfully" },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
      queryClient.invalidateQueries({ queryKey: brandKeys.detail(variables.uuid) });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => deleteBrand(uuid),
    meta: { successMessage: "Brand deleted successfully" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
    },
  });
}
