"use client";

import { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormModal } from "@/components/common/FormModal";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  AdminPageHeader,
  AdminContent,
} from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/Toast";
import { Plus, Pencil } from "lucide-react";
import {
  useInventory,
  useAdjustStock,
  useCreateInventory,
} from "@/features/inventory/hooks";
import type {
  InventoryListItem,
  InventoryTransactionType,
  GetInventoryParams,
} from "@/features/inventory/types";

const adjustStockFormSchema = z.object({
  inventoryId: z.number().min(1, "Select an inventory item"),
  type: z.enum([
    "PURCHASE",
    "SALE",
    "RETURN",
    "ADJUSTMENT",
    "DAMAGE",
    "TRANSFER",
  ]),
  quantity: z
    .number()
    .int()
    .refine((val) => val !== 0, "Quantity cannot be zero"),
  notes: z.string().optional(),
});

const createInventoryFormSchema = z.object({
  productId: z.number().min(1, "Select a product"),
  variantId: z.number().optional(),
  quantity: z.number().int().min(0, "Quantity must be at least 0"),
  reorderLevel: z
    .number()
    .int()
    .min(0, "Reorder level must be at least 0")
    .optional(),
});

type AdjustStockForm = z.infer<typeof adjustStockFormSchema>;
type CreateInventoryForm = z.infer<typeof createInventoryFormSchema>;

const transactionTypes: { value: InventoryTransactionType; label: string }[] =
  [
    { value: "PURCHASE", label: "Purchase" },
    { value: "SALE", label: "Sale" },
    { value: "RETURN", label: "Return" },
    { value: "ADJUSTMENT", label: "Adjustment" },
    { value: "DAMAGE", label: "Damage" },
    { value: "TRANSFER", label: "Transfer" },
  ];

function getStatusBadge(item: InventoryListItem) {
  if (item.quantity === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }
  if (item.quantity <= item.reorderLevel) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
        Low Stock
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
      In Stock
    </Badge>
  );
}

export default function InventoryStockPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useInventory({
    page,
    limit: pageSize,
  });
  const adjustMutation = useAdjustStock();
  const createMutation = useCreateInventory();

  const adjustForm = useForm<AdjustStockForm>({
    resolver: zodResolver(adjustStockFormSchema),
    defaultValues: {
      inventoryId: 0,
      type: "ADJUSTMENT",
      quantity: 0,
      notes: "",
    },
  });

  const createForm = useForm<CreateInventoryForm>({
    resolver: zodResolver(createInventoryFormSchema),
    defaultValues: {
      productId: 0,
      variantId: undefined,
      quantity: 0,
      reorderLevel: 10,
    },
  });

  const inventoryData = data?.data?.data ?? [];

  const inventoryOptions = useMemo(
    () =>
      (inventoryData ?? []).map((item) => ({
        value: String(item.id),
        label: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
      })),
    [inventoryData]
  );

  const filteredData = useMemo(() => {
    if (!search.trim()) return inventoryData;
    const q = search.toLowerCase();
    return inventoryData.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        (item.variantName && item.variantName.toLowerCase().includes(q))
    );
  }, [inventoryData, search]);

  const columns: ColumnDef<InventoryListItem>[] = [
    {
      accessorKey: "productName",
      header: "Product Name",
      cell: ({ row }) => (
        <p className="font-semibold text-[var(--color-neutral-900)]">
          {row.original.productName}
        </p>
      ),
    },
    {
      accessorKey: "variantName",
      header: "Variant",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">
          {row.original.variantName ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-neutral-800)]">
          {row.original.quantity}
        </span>
      ),
    },
    {
      accessorKey: "reservedQuantity",
      header: "Reserved",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-600)]">
          {row.original.reservedQuantity}
        </span>
      ),
    },
    {
      accessorKey: "availableQuantity",
      header: "Available",
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-neutral-800)]">
          {row.original.availableQuantity}
        </span>
      ),
    },
    {
      accessorKey: "reorderLevel",
      header: "Reorder Level",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-600)]">
          {row.original.reorderLevel}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              adjustForm.reset({
                inventoryId: row.original.id,
                type: "ADJUSTMENT",
                quantity: 0,
                notes: "",
              });
              setAdjustOpen(true);
            }}
            className="h-8 rounded-lg text-xs font-semibold hover:border-secondary-600 hover:text-secondary-700"
          >
            Adjust Stock
          </Button>
        </div>
      ),
    },
  ];

  const handleAdjustSubmit = (values: AdjustStockForm) => {
    adjustMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Stock Adjusted", "Inventory stock adjusted successfully.");
        setAdjustOpen(false);
        adjustForm.reset();
      },
      onError: (err: any) => {
        toast.error("Adjustment Failed", err?.message || "Could not adjust stock.");
      },
    });
  };

  const handleCreateSubmit = (values: CreateInventoryForm) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Inventory Created", "New inventory record created successfully.");
        setCreateOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast.error("Creation Failed", err?.message || "Could not create inventory record.");
      },
    });
  };

  if (isLoading && !data) return <AdminTableSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Inventory Stock"
        description="Manage your inventory stock levels and threshold alerts."
      />
      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          {/* Search + Add Button Header */}
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search inventory by product or variant..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={filteredData}
                filename="inventory_stock"
                sheetName="Inventory Stock"
                columns={EXPORT_PRESETS.inventoryStock}
              />

              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Inventory
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <DataTable
              columns={columns}
              data={filteredData}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={page}
              totalPages={Math.max(1, Math.ceil(filteredData.length / pageSize))}
              totalItems={filteredData.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              emptyMessage={
                search
                  ? "No inventory items match your search."
                  : "No inventory records created yet."
              }
              className="bg-white"
            />
          </div>
        </div>
      </AdminContent>

      <FormModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Adjust Stock"
        description="Adjust inventory stock levels"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={adjustForm.handleSubmit(handleAdjustSubmit)}
              disabled={adjustMutation.isPending}
              className="bg-[var(--color-secondary-600)] hover:bg-[var(--color-secondary-700)] text-white"
            >
              {adjustMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inventory Item <span className="text-rose-500">*</span>
            </label>
            <Select
              value={adjustForm.watch("inventoryId") ? String(adjustForm.watch("inventoryId")) : ""}
              onValueChange={(val) =>
                adjustForm.setValue("inventoryId", Number(val), { shouldValidate: true })
              }
              options={inventoryOptions}
              placeholder="Select item"
              error={!!adjustForm.formState.errors.inventoryId}
            />
            {adjustForm.formState.errors.inventoryId && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {adjustForm.formState.errors.inventoryId.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-rose-500">*</span>
            </label>
            <Select
              value={adjustForm.watch("type")}
              onValueChange={(val) =>
                adjustForm.setValue("type", val as InventoryTransactionType, { shouldValidate: true })
              }
              options={transactionTypes}
              error={!!adjustForm.formState.errors.type}
            />
            {adjustForm.formState.errors.type && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {adjustForm.formState.errors.type.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity (negative for reduction) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              {...adjustForm.register("quantity", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              rows={3}
              {...adjustForm.register("notes")}
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Inventory"
        description="Create a new inventory record"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createForm.handleSubmit(handleCreateSubmit)}
              disabled={createMutation.isPending}
              className="bg-[var(--color-secondary-600)] hover:bg-[var(--color-secondary-700)] text-white"
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Enter product ID"
              {...createForm.register("productId", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variant ID (optional)
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Enter variant ID"
              {...createForm.register("variantId", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              {...createForm.register("quantity", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              {...createForm.register("reorderLevel", { valueAsNumber: true })}
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
