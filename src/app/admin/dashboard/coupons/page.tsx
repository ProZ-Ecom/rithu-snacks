"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  getCoupons,
} from "@/features/coupons/hooks";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { exportToExcel } from "@/lib/excel-export";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import {
  AdminPageHeader,
  AdminContent,
} from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormModal } from "@/components/common/FormModal";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createCouponSchema,
  type CreateCouponSchemaInput,
} from "@/features/coupons/validations/coupon.schema";
import type { ColumnDef } from "@tanstack/react-table";
import type { CouponListItem } from "@/features/coupons/types";

const typeBadgeVariant: Record<string, "info" | "success"> = {
  PERCENTAGE: "info",
  percentage: "info",
  FIXED: "success",
  flat: "success",
};

export default function AdminCouponsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponListItem | null>(null);

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<CouponListItem[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, page, pageSize]);

  const { data, isLoading, error, refetch } = useCoupons({
    page,
    limit: pageSize,
    search: search || undefined,
  });

  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const deleteMutation = useDeleteCoupon();

  const coupons = data?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCouponSchemaInput>({
    resolver: zodResolver(createCouponSchema) as any,
    defaultValues: {
      code: "",
      type: "PERCENTAGE",
      value: "" as unknown as number,
      minOrderAmount: "" as unknown as number,
      maxDiscount: "" as unknown as number,
      usageLimit: "" as unknown as number,
      usageLimitPerUser: 1,
      isFirstOrderOnly: false,
      isActive: true,
      startsAt: "",
      expiresAt: "",
    },
  });

  useEffect(() => {
    if (editingCoupon) {
      const normalizedType =
        editingCoupon.type?.toUpperCase() === "FLAT" || editingCoupon.type?.toUpperCase() === "FIXED"
          ? "FIXED"
          : "PERCENTAGE";
      reset({
        code: editingCoupon.code,
        type: normalizedType,
        value: editingCoupon.value,
        minOrderAmount: editingCoupon.minOrderAmount ?? ("" as unknown as number),
        maxDiscount: editingCoupon.maxDiscount ?? ("" as unknown as number),
        usageLimit: editingCoupon.usageLimit ?? ("" as unknown as number),
        usageLimitPerUser: editingCoupon.usageLimitPerUser ?? 1,
        isFirstOrderOnly: Boolean(editingCoupon.isFirstOrderOnly),
        isActive: editingCoupon.isActive,
        startsAt: editingCoupon.startsAt
          ? new Date(editingCoupon.startsAt).toISOString().split("T")[0]
          : "",
        expiresAt: editingCoupon.expiresAt
          ? new Date(editingCoupon.expiresAt).toISOString().split("T")[0]
          : "",
      });
    } else {
      reset({
        code: "",
        type: "PERCENTAGE",
        value: "" as unknown as number,
        minOrderAmount: "" as unknown as number,
        maxDiscount: "" as unknown as number,
        usageLimit: "" as unknown as number,
        usageLimitPerUser: 1,
        isFirstOrderOnly: false,
        isActive: true,
        startsAt: "",
        expiresAt: "",
      });
    }
  }, [editingCoupon, reset]);

  const onSubmit = (formData: CreateCouponSchemaInput) => {
    if (editingCoupon) {
      updateMutation.mutate(
        { id: editingCoupon.id, data: formData },
        {
          onSuccess: () => {
            setModalOpen(false);
            setEditingCoupon(null);
          },
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          setModalOpen(false);
          reset({
            code: "",
            type: "PERCENTAGE",
            value: "" as unknown as number,
            minOrderAmount: "" as unknown as number,
            maxDiscount: "" as unknown as number,
            usageLimit: "" as unknown as number,
            usageLimitPerUser: 1,
            isFirstOrderOnly: false,
            isActive: true,
            startsAt: "",
            expiresAt: "",
          });
        },
      });
    }
  };

  const handleOpenModal = (coupon?: CouponListItem) => {
    if (coupon) {
      setEditingCoupon(coupon);
    } else {
      setEditingCoupon(null);
      reset({
        code: "",
        type: "PERCENTAGE",
        value: "" as unknown as number,
        minOrderAmount: "" as unknown as number,
        maxDiscount: "" as unknown as number,
        usageLimit: "" as unknown as number,
        usageLimitPerUser: 1,
        isFirstOrderOnly: false,
        isActive: true,
        startsAt: "",
        expiresAt: "",
      });
    }
    setModalOpen(true);
  };

  const columns: ColumnDef<CouponListItem, unknown>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <p className="font-mono font-semibold text-neutral-900">{row.original.code}</p>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const typeStr =
          row.original.type?.toUpperCase() === "FLAT" || row.original.type?.toUpperCase() === "FIXED"
            ? "FIXED"
            : "PERCENTAGE";
        return (
          <Badge variant={typeBadgeVariant[typeStr] ?? "secondary"}>
            {typeStr}
          </Badge>
        );
      },
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => {
        const isPercentage =
          row.original.type?.toUpperCase() === "PERCENTAGE";
        return (
          <span className="font-semibold text-neutral-900">
            {isPercentage ? `${row.original.value}%` : `₹${row.original.value}`}
          </span>
        );
      },
    },
    {
      id: "eligibility",
      header: "Eligibility",
      cell: ({ row }) => (
        row.original.isFirstOrderOnly ? (
          <Badge variant="warning" className="text-[11px] font-semibold">
            1st Order Only
          </Badge>
        ) : (
          <span className="text-neutral-500 text-xs">All Customers</span>
        )
      ),
    },
    {
      id: "usage",
      header: "Uses & Limits",
      cell: ({ row }) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-neutral-800">
            {row.original.usedCount} used
            {row.original.usageLimit ? ` / ${row.original.usageLimit} max` : " (Unlimited)"}
          </div>
          <div className="text-[11px] text-neutral-500">
            {row.original.usageLimitPerUser ? `${row.original.usageLimitPerUser} per user` : "1 per user"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "expiresAt",
      header: "Expiry",
      cell: ({ row }) => (
        <span className="text-neutral-600 text-xs">
          {row.original.expiresAt
            ? new Date(row.original.expiresAt).toLocaleDateString("en-IN")
            : "No expiry"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenModal(row.original)}
            className="h-8 w-8 text-neutral-500 hover:text-secondary-700 hover:bg-secondary-50 cursor-pointer"
            title="Edit coupon"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
            className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            title="Delete coupon"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading && !data) return <AdminTableSkeleton />;
  if (error) return <ErrorState message="Failed to load coupons" onRetry={() => refetch()} />;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Coupons"
        description="Manage discount coupons"
      />

      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          {/* Search + Add Button Header */}
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search coupons..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={coupons}
                fetchData={async () => {
                  const res = await getCoupons({
                    page: 1,
                    limit: 10000,
                    search: search.trim() || undefined,
                  });
                  return res?.data ?? [];
                }}
                totalCount={data?.meta?.total ?? coupons.length}
                filename="coupons"
                sheetName="Coupons"
                columns={EXPORT_PRESETS.coupons}
              />

              <Button
                type="button"
                onClick={() => handleOpenModal()}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Coupon
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="coupon"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_coupons",
                  sheetName: "Selected Coupons",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.coupons,
                });
              }}
            />

            <DataTable
              columns={columns}
              data={coupons}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={
                data?.meta?.totalPages ??
                Math.max(1, Math.ceil((data?.meta?.total ?? coupons.length) / pageSize))
              }
              totalItems={data?.meta?.total ?? coupons.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              selectedRowIds={selectedRowIds}
              onRowSelectionChange={(newSelection, items) => {
                setSelectedRowIds(newSelection);
                setSelectedRows(items);
              }}
              getRowId={(row) => String(row.id)}
              emptyMessage={
                search
                  ? "No coupons match your search."
                  : "No coupons created yet."
              }
              className="bg-white"
            />
          </div>
        </div>
      </AdminContent>

      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCoupon(null);
        }}
        title={editingCoupon ? "Edit Coupon" : "Add Coupon"}
        description={editingCoupon ? "Update coupon details" : "Create a new coupon"}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setEditingCoupon(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[var(--color-secondary-600)] hover:bg-[var(--color-secondary-700)] text-white"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingCoupon
                ? "Update"
                : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code <span className="text-rose-500">*</span>
            </label>
            <input
              {...register("code")}
              className={`w-full rounded-lg border px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 ${
                errors.code
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                  : "border-gray-300 focus:border-primary focus:ring-primary/30"
              }`}
              placeholder="Enter coupon code"
            />
            {errors.code && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.code.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-rose-500">*</span>
              </label>
              <Select
                value={watch("type")}
                onValueChange={(val) =>
                  setValue("type", val as "PERCENTAGE" | "FIXED", { shouldValidate: true })
                }
                options={[
                  { value: "PERCENTAGE", label: "Percentage" },
                  { value: "FIXED", label: "Fixed Amount" },
                ]}
                error={!!errors.type}
              />
              {errors.type && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register("value", {
                  setValueAs: (v) => (v === "" || v === null || v === undefined ? "" : Number(v)),
                })}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.value
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                    : "border-gray-300 focus:border-primary focus:ring-primary/30"
                }`}
                placeholder="0"
              />
              {errors.value && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.value.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Order Amount <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register("minOrderAmount", {
                  setValueAs: (v) => (v === "" || v === null || v === undefined ? "" : Number(v)),
                })}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.minOrderAmount
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                    : "border-gray-300 focus:border-primary focus:ring-primary/30"
                }`}
                placeholder="0"
              />
              {errors.minOrderAmount && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.minOrderAmount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Discount <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register("maxDiscount", {
                  setValueAs: (v) => (v === "" || v === null || v === undefined ? "" : Number(v)),
                })}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.maxDiscount
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                    : "border-gray-300 focus:border-primary focus:ring-primary/30"
                }`}
                placeholder="0"
              />
              {errors.maxDiscount && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.maxDiscount.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Orders Limit (All Customers)
              </label>
              <input
                type="number"
                {...register("usageLimit", {
                  setValueAs: (v) => (v === "" || v === null || v === undefined ? "" : Number(v)),
                })}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.usageLimit
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                    : "border-gray-300 focus:border-primary focus:ring-primary/30"
                }`}
                placeholder="Unlimited (leave empty)"
              />
              <p className="mt-1 text-[11px] text-gray-500">Max total orders across all customers (e.g. 50 for flash sales)</p>
              {errors.usageLimit && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.usageLimit.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Uses Per Customer <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                {...register("usageLimitPerUser", {
                  setValueAs: (v) => (v === "" || v === null || v === undefined ? 1 : Number(v)),
                })}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.usageLimitPerUser
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                    : "border-gray-300 focus:border-primary focus:ring-primary/30"
                }`}
                placeholder="1"
              />
              <p className="mt-1 text-[11px] text-gray-500">How many times each customer can use this code (default: 1)</p>
              {errors.usageLimitPerUser && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.usageLimitPerUser.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("isFirstOrderOnly")}
                id="isFirstOrderOnly"
                className="h-4 w-4 rounded border-gray-300 text-secondary-600 focus:ring-secondary-500"
              />
              <label htmlFor="isFirstOrderOnly" className="text-sm font-semibold text-amber-900 cursor-pointer">
                Only valid for new customers (1st order only)
              </label>
            </div>
            <p className="text-[11px] text-amber-700 ml-6 mt-0.5">
              If checked, only customers with zero previous orders can apply this code (e.g. WELCOME50).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starts At
              </label>
              <input
                type="date"
                {...register("startsAt")}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.startsAt
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                    : "border-gray-300 focus:border-primary focus:ring-primary/30"
                }`}
              />
              {errors.startsAt && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.startsAt.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires At
              </label>
              <input
                type="date"
                {...register("expiresAt")}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.expiresAt
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                    : "border-gray-300 focus:border-primary focus:ring-primary/30"
                }`}
              />
              {errors.expiresAt && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.expiresAt.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("isActive")}
              id="isActive"
              className="h-4 w-4 rounded border-gray-300 text-secondary-600 focus:ring-secondary-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
              Active
            </label>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
              },
            });
          }
        }}
        title="Delete Coupon"
        description="Are you sure you want to delete this coupon? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
