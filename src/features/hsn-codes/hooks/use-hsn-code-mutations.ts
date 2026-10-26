"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hsnCodeKeys } from "@/lib/api/query-keys";
import {
  createHsnCode,
  updateHsnCode,
  deleteHsnCode,
} from "@/features/hsn-codes/api/get-hsn-codes";

export function useCreateHsnCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createHsnCode(data),
    meta: { successMessage: "HSN code created successfully" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hsnCodeKeys.all });
    },
  });
}

export function useUpdateHsnCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uuid,
      data,
    }: {
      uuid: string;
      data: Record<string, unknown>;
    }) => updateHsnCode(uuid, data),
    meta: { successMessage: "HSN code updated successfully" },

    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: hsnCodeKeys.all });
      queryClient.invalidateQueries({
        queryKey: hsnCodeKeys.detail(variables.uuid),
      });
    },
  });
}

export function useDeleteHsnCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => deleteHsnCode(uuid),
    meta: { successMessage: "HSN code deleted successfully" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hsnCodeKeys.all });
    },
  });
}