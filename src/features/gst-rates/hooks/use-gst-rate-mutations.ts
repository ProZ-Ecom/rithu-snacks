"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gstRateKeys } from "@/lib/api/query-keys";
import {
  createGstRate,
  updateGstRate,
  deleteGstRate,
} from "@/features/gst-rates/api/get-gst-rates";

export function useCreateGstRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createGstRate(data),
    meta: { successMessage: "GST rate created successfully" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gstRateKeys.all });
    },
  });
}

export function useUpdateGstRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uuid,
      data,
    }: {
      uuid: string;
      data: Record<string, unknown>;
    }) => updateGstRate(uuid, data),
    meta: { successMessage: "GST rate updated successfully" },

    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: gstRateKeys.all });
      queryClient.invalidateQueries({
        queryKey: gstRateKeys.detail(variables.uuid),
      });
    },
  });
}

export function useDeleteGstRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => deleteGstRate(uuid),
    meta: { successMessage: "GST rate deleted successfully" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gstRateKeys.all });
    },
  });
}