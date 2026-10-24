import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getInventory,
  getInventoryItem,
  adjustStock,
  createInventory,
  getLowStock,
  getTransactions,
} from "../api/get-inventory";

export {
  getInventory,
  getInventoryItem,
  adjustStock,
  createInventory,
  getLowStock,
  getTransactions,
};
import type {
  GetInventoryParams,
  AdjustStockInput,
  CreateInventoryInput,
} from "../types";

const inventoryKeys = {
  all: ["inventory"] as const,
  list: (params: GetInventoryParams) =>
    [...inventoryKeys.all, "list", params] as const,
  detail: (id: string) => [...inventoryKeys.all, "detail", id] as const,
  lowStock: () => [...inventoryKeys.all, "lowStock"] as const,
  transactions: (inventoryId: string, params?: any) =>
    [...inventoryKeys.all, "transactions", inventoryId, params] as const,
};

export function useInventory(params: GetInventoryParams) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => getInventory(params),
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => getInventoryItem(id),
    enabled: !!id,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdjustStockInput) => adjustStock(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInventoryInput) => createInventory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => getLowStock(),
  });
}

export function useInventoryTransactions(
  inventoryId: string,
  params?: { page?: number; limit?: number; type?: string }
) {
  return useQuery({
    queryKey: inventoryKeys.transactions(inventoryId, params),
    queryFn: () => getTransactions(inventoryId, params),
    enabled: !!inventoryId,
  });
}
