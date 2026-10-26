"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unitKeys } from "@/lib/api/query-keys";
import {
  createUnit,
  updateUnit,
  deleteUnit,
} from "../api/get-units";

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createUnit(data),
    meta: { successMessage: "Unit created successfully" },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: unitKeys.all,
      });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uuid,
      data,
    }: {
      uuid: string;
      data: Record<string, unknown>;
    }) => updateUnit(uuid, data),
    meta: { successMessage: "Unit updated successfully" },

    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: unitKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: unitKeys.detail(variables.uuid),
      });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uuid: string) => deleteUnit(uuid),
    meta: { successMessage: "Unit deleted successfully" },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: unitKeys.all,
      });
    },
  });
}