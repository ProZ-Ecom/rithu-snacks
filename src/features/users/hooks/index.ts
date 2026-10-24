"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/lib/api/query-keys";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} from "../api/get-users";
export { getUsers, getUser };
import type { GetUserParams } from "../types";

export function useUsers(params?: GetUserParams) {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.search) queryParams.search = params.search;
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.status) queryParams.status = params.status;
  if (params?.roleId) queryParams.roleId = params.roleId;

  return useQuery({
    queryKey: userKeys.list(queryParams),
    queryFn: () => getUsers(queryParams),
  });
}

export function useUser(id: string | number | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => getUser(id!),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Record<string, unknown> }) =>
      updateUser(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, password }: { id: string | number; password: string }) =>
      resetPassword(id, { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
