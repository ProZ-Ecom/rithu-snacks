"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useVariants,
  useVariantUnitPrices,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useBulkDeleteVariants,
} from "@/features/variants/hooks";
import { getAdminVariants } from "@/features/variants/api/get-variants";
import { toast } from "@/components/ui/Toast";
import { useProducts } from "@/features/products/hooks";
import { useUnits } from "@/features/units/hooks";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { exportToExcel, exportVariantsMatrixToExcel } from "@/lib/excel-export";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import {
  AdminPageHeader,
  AdminContent,
} from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormModal } from "@/components/common/FormModal";
import { SearchInput } from "@/components/ui/search-input";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Check,
  CheckCircle2,
  XCircle,
  ImageIcon,
  Eye,
  LayoutList,
  LayoutGrid,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  ArrowLeftRight,
  AlertCircle,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminVariantResponse } from "@/features/variants/types";
import {
  VariantForm,
  VariantImageUploader,
  VariantCard,
  VariantCustomerPreviewModal,
  VariantUnitPriceList,
} from "@/features/variants/components";

type ViewMode = "table" | "cards";

export default function AdminVariantsPage() {
  const [search, setSearch] = useState("");
  const [selectedProductFilter, setSelectedProductFilter] =
    useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [deleteTarget, setDeleteTarget] = useState<{
    productUuid: string;
    variantUuid: string;
  } | null>(null);

  // Add Stepper State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [createdVariant, setCreatedVariant] = useState<{
    id: string;
    productId: string;
    name: string;
    variantData?: AdminVariantResponse | null;
  } | null>(null);

  // Edit State & Tabs
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<"details" | "pricing" | "images">("details");
  const [selectedVariant, setSelectedVariant] =
    useState<AdminVariantResponse | null>(null);

  // Customer Preview Modal State
  const [previewVariant, setPreviewVariant] =
    useState<AdminVariantResponse | null>(null);

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<AdminVariantResponse[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  useEffect(() => {
    setPage(1);
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, selectedProductFilter]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [page, pageSize]);

  // Main Variants Query
  const { data, isLoading, error, refetch } = useVariants({
    page,
    pageSize,
    search: search || undefined,
    productIds: selectedProductFilter ? [selectedProductFilter] : undefined,
  });

  // Reference queries
  const { data: productsData } = useProducts({ pageSize: 100 });
  const { data: unitsData } = useUnits({ pageSize: 100 });

  const createMutation = useCreateVariant();
  const updateMutation = useUpdateVariant();
  const deleteMutation = useDeleteVariant();
  const bulkDeleteMutation = useBulkDeleteVariants();

  // Unit prices for the newly created item in the modal stepper
  const { data: createdVariantPrices = [] } = useVariantUnitPrices(
    createdVariant?.productId || null,
    createdVariant?.id || null
  );
  const hasCreatedPrices = createdVariantPrices.length > 0;

  const variants = data?.data ?? [];
  const products = productsData?.data ?? [];
  const units = unitsData?.data ?? [];

  const totalItems = data?.meta?.total ?? variants.length;
  const totalPages =
    data?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));

  // Options for form dropdowns & filter
  const productOptions = useMemo(() => {
    return products.map((p: any) => ({
      value: p.id,
      label: p.name,
      slug: p.slug,
    }));
  }, [products]);

  const productFilterOptions = useMemo(() => {
    return [
      { value: "", label: "All Products" },
      ...productOptions,
    ];
  }, [productOptions]);

  const activeProductName = useMemo(() => {
    if (!selectedProductFilter) return null;
    const match = products.find((p: any) => String(p.id) === selectedProductFilter);
    return match?.name || null;
  }, [selectedProductFilter, products]);

  const filterNotice = useMemo(() => {
    const parts: string[] = [];
    if (search.trim()) parts.push(`"${search.trim()}"`);
    if (activeProductName) parts.push(`Product: ${activeProductName}`);
    return parts.length > 0 ? `Filtered by ${parts.join(" & ")}` : undefined;
  }, [search, activeProductName]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedProductFilter("");
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== "" || selectedProductFilter !== "";

  const handleToggleStatus = async (
    variant: AdminVariantResponse,
    nextActive: boolean
  ) => {
    if (nextActive && (!variant.unitPrices || variant.unitPrices.length === 0)) {
      toast.error(
        "Cannot activate item",
        "Please add at least one unit price before activating this item for customers."
      );
      return;
    }
    try {
      await updateMutation.mutateAsync({
        productUuid: variant.productId,
        variantUuid: variant.id,
        data: { isActive: nextActive },
      });
      refetch();
    } catch (err: any) {
      console.error("Failed to toggle Items status", err);
      toast.error(
        "Status not changed",
        err?.message || "Please add at least one unit price first."
      );
    }
  };

  const handleToggleStock = async (
    variant: AdminVariantResponse,
    nextOutOfStock: boolean
  ) => {
    try {
      await updateMutation.mutateAsync({
        productUuid: variant.productId,
        variantUuid: variant.id,
        data: { outOfStock: nextOutOfStock },
      });
      refetch();
    } catch (err: any) {
      console.error("Failed to toggle Item stock", err);
      toast.error(
        "Stock not changed",
        err?.message || "Failed to update stock status."
      );
    }
  };

  const columns: ColumnDef<AdminVariantResponse>[] = [
    {
      accessorKey: "primaryImage",
      header: "Image",
      cell: ({ row }) => {
        const imageUrl = row.original.primaryImage;
        return (
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] flex items-center justify-center">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={row.original.variantName || "Variant"}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <Package className="h-5 w-5 text-[var(--color-neutral-400)]" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "productName",
      header: "Product",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-[var(--color-neutral-900)]">
            {row.original.productName || "—"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "variantName",
      header: "Item & SKU",
      cell: ({ row }) => (
        <Link
          href={`/admin/dashboard/variants/${encodeURIComponent(
            row.original.id
          )}?productId=${encodeURIComponent(row.original.productId)}`}
          className="group block cursor-pointer"
          title="View Variant Details"
        >
          <p className="font-medium text-[var(--color-neutral-900)] group-hover:text-secondary-600 transition-colors">
            {row.original.variantName || "—"}
          </p>
          <p className="text-xs text-[var(--color-neutral-500)] mt-0.5 font-mono">
            {row.original.sku}
          </p>
        </Link>
      ),
    },
    {
      accessorKey: "measurement",
      header: "Pack Sizes",
      cell: ({ row }) => {
        const prices = row.original.unitPrices ?? [];
        if (prices.length === 0) {
          return <span className="text-[var(--color-neutral-400)] text-xs italic">No sizes added</span>;
        }
        const m = row.original.measurement;
        const typeBadgeStyles =
          m?.type === "weight"
            ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]"
            : m?.type === "volume"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-amber-50 text-amber-700 border-amber-200";

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {m && (
              <>
                <span className="font-semibold text-[var(--color-neutral-800)]">
                  {m.value} {m.unit}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${typeBadgeStyles}`}
                >
                  {m.type}
                </span>
              </>
            )}
            {prices.length > 1 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200"
                title={prices.map((p) => `${p.measurement.value} ${p.measurement.unit}`).join(", ")}
              >
                +{prices.length - 1} more size{prices.length - 1 > 1 ? "s" : ""}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "basePrice",
      header: "Price",
      cell: ({ row }) => {
        const prices = (row.original.unitPrices ?? []).map((p) => p.basePrice);
        if (prices.length === 0) {
          return <span className="text-[var(--color-neutral-400)] text-xs italic">—</span>;
        }
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return (
          <span className="text-[var(--color-neutral-700)] font-medium">
            {min === max ? `₹${min}` : `₹${min} – ₹${max}`}
          </span>
        );
      },
    },
    {
      accessorKey: "outOfStock",
      header: "Stock",
      cell: ({ row }) => {
        const isOutOfStock = Boolean(row.original.outOfStock);
        const isRowPending =
          updateMutation.isPending &&
          updateMutation.variables?.variantUuid === row.original.id;

        return (
          <button
            type="button"
            onClick={() => handleToggleStock(row.original, !isOutOfStock)}
            disabled={isRowPending}
            title={isOutOfStock ? "Click to mark In Stock" : "Click to mark Out of Stock"}
            className={`group inline-flex items-center justify-between min-w-[132px] h-8 px-3 rounded-md text-xs font-bold border bg-white cursor-pointer shadow-xs transition-all hover:shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${
              !isOutOfStock
                ? "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                : "text-rose-700 border-rose-300 hover:bg-rose-50"
            }`}
          >
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              {isRowPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : !isOutOfStock ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              )}
              <span className="whitespace-nowrap select-none">{!isOutOfStock ? "In Stock" : "Out of Stock"}</span>
            </span>
            {!isRowPending && (
              <ArrowLeftRight className="w-3 h-3 opacity-40 group-hover:opacity-80 transition-opacity shrink-0 ml-1.5" />
            )}
          </button>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = Boolean(row.original.isActive);
        const isRowPending =
          updateMutation.isPending &&
          updateMutation.variables?.variantUuid === row.original.id;

        return (
          <button
            type="button"
            onClick={() => handleToggleStatus(row.original, !isActive)}
            disabled={isRowPending}
            title={isActive ? "Click to set Inactive" : "Click to set Active"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-all hover:opacity-80 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
              isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200"
            }`}
          >
            {isRowPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? "bg-emerald-600" : "bg-neutral-400"
                }`}
              />
            )}
            {isActive ? "Active" : "Inactive"}
          </button>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5">
          <Link
            href={`/admin/dashboard/variants/${encodeURIComponent(
              row.original.id
            )}?productId=${encodeURIComponent(row.original.productId)}`}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--color-neutral-500)] hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            title="View full details"
          >
            <Eye className="h-4 w-4" />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            title="Edit item (details, pricing & images)"
            onClick={() => {
              setSelectedVariant(row.original);
              setEditTab("details");
              setIsEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 text-[var(--color-neutral-500)]" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title="Delete item"
            onClick={() =>
              setDeleteTarget({
                productUuid: row.original.productId,
                variantUuid: row.original.id,
              })
            }
          >
            <Trash2 className="h-4 w-4 text-[var(--color-error-600)]" />
          </Button>
        </div>
      ),
    },
  ];

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setCreateStep(1);
    setCreatedVariant(null);
    refetch();
  };

  if (isLoading && !data) {
    return <AdminTableSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load product Items"
        onRetry={() => refetch()}
      />
    );
  }

  const startEntry = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endEntry = totalItems > 0 ? Math.min(page * pageSize, totalItems) : 0;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Product Items Management"
        description="Manage product Items, sizing, packaging, pricing, SKUs, and images with realistic customer card preview."
      />

      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          {/* Controls Header */}
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                placeholder="Search Items by name, SKU..."
                value={search}
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                className="w-full max-w-md"
              />

              <div className="w-full sm:w-64">
                <Select
                  value={selectedProductFilter}
                  onChange={(e) => setSelectedProductFilter(e.target.value)}
                  options={productFilterOptions}
                  placeholder="All Products"
                  className="h-11 rounded-xl"
                />
              </div>

              {hasActiveFilters && <ClearFiltersButton onClick={handleClearFilters} />}
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle: Table View vs Customer Card View */}
              <div className="flex items-center bg-cream-200 border border-cream-border p-1 rounded-xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "table"
                    ? "bg-[var(--color-secondary-600)] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  title="Table List View"
                >
                  <LayoutList className="h-4 w-4" />
                  <span className="hidden sm:inline">Table View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "cards"
                    ? "bg-[var(--color-secondary-600)] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  title="Storefront Customer Card View"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Card View</span>
                </button>
              </div>

              <ExportExcelButton
                data={variants}
                fetchData={async () => {
                  const res = await getAdminVariants({
                    page: 1,
                    pageSize: 10000,
                    search: search || undefined,
                    productIds: selectedProductFilter ? [selectedProductFilter] : undefined,
                  });
                  return res.data;
                }}
                totalCount={totalItems}
                filename="items_catalog"
                sheetName="Items"
                columns={EXPORT_PRESETS.variants}
                onCustomExport={(itemsToExport) => {
                  exportVariantsMatrixToExcel({
                    filename: "items_catalog",
                    sheetName: "Items",
                    variants: itemsToExport,
                  });
                }}
              />

              <Button
                onClick={() => {
                  setCreateStep(1);
                  setCreatedVariant(null);
                  setIsCreateOpen(true);
                }}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* VIEW RENDERER: Table View vs Customer Card View */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="item"
              filterNotice={filterNotice}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportVariantsMatrixToExcel({
                  filename: "selected_items_catalog",
                  sheetName: "Selected Items",
                  variants: selectedRows,
                });
              }}
              onDelete={() => setIsBulkDeleteOpen(true)}
              isDeleting={bulkDeleteMutation.isPending}
            />

            {viewMode === "table" ? (
              <DataTable
                columns={columns}
                data={variants}
                pageSize={pageSize}
                pageSizeOptions={[10, 12, 20, 30, 50]}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={(newPageSize) => {
                  setPageSize(newPageSize);
                  setPage(1);
                }}
                selectedRowIds={selectedRowIds}
                onRowSelectionChange={(newSelection, items) => {
                  setSelectedRowIds(newSelection);
                  setSelectedRows(items);
                }}
                getRowId={(row) => String(row.id)}
                className="bg-white"
              />
            ) : (
              <div className="flex-1 flex flex-col justify-between pr-1 pb-4">
                {variants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-neutral-200">
                    <Package className="h-12 w-12 text-neutral-300 mb-3" />
                    <h3 className="text-base font-bold text-neutral-800">
                      No Items found
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                      {search || selectedProductFilter
                        ? "Try clearing filters or search query to find Items."
                        : "Start by adding your first product Item."}
                    </p>
                    <Button
                      onClick={() => {
                        setCreateStep(1);
                        setCreatedVariant(null);
                        setIsCreateOpen(true);
                      }}
                      className="mt-5 rounded-xl bg-[var(--color-secondary-600)] text-xs font-semibold text-white"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>
                ) : (
                  <div>
                    {/* Variants Card Grid in Storefront Format */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {variants.map((variant) => (
                        <VariantCard
                          key={variant.id}
                          variant={variant}
                          onEdit={(v) => {
                            setSelectedVariant(v);
                            setEditTab("details");
                            setIsEditOpen(true);
                          }}
                          onManageImages={(v) => {
                            setSelectedVariant(v);
                            setEditTab("images");
                            setIsEditOpen(true);
                          }}
                          onDelete={(v) =>
                            setDeleteTarget({
                              productUuid: v.productId,
                              variantUuid: v.id,
                            })
                          }
                          onPreview={(v) => setPreviewVariant(v)}
                          onToggleStatus={handleToggleStatus}
                          onToggleStock={handleToggleStock}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Card View Pagination Footer */}
                {totalItems > 0 && (
                  <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white border border-neutral-200 rounded-xl shadow-2xs">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-[var(--color-neutral-500)]">
                      <p>
                        Showing {startEntry}–{endEntry} of {totalItems} Items
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--color-neutral-600)]">
                          Cards per page:
                        </span>
                        <div className="w-20">
                          <Select
                            value={String(pageSize)}
                            onValueChange={(val) => {
                              setPageSize(Number(val));
                              setPage(1);
                            }}
                            options={[8, 12, 16, 24, 32, 48].map((opt) => ({
                              value: String(opt),
                              label: String(opt),
                            }))}
                            size="sm"
                            placement="top"
                            className="h-8 rounded-lg font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page <= 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-700)] transition-colors hover:bg-[var(--color-neutral-50)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold text-[var(--color-neutral-800)] px-1.5">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page >= totalPages}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-700)] transition-colors hover:bg-[var(--color-neutral-50)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AdminContent>

      {/* CREATE MODAL WITH STEPPER & STOREFRONT CARD PREVIEW */}
      <FormModal
        open={isCreateOpen}
        onClose={handleCloseCreateModal}
        title={
          createStep === 1
            ? "Add Product Item"
            : createStep === 2
              ? `Units & Pricing: ${createdVariant?.name || "Item"}`
              : createStep === 3
                ? `Add Images: ${createdVariant?.name || "Item"}`
                : `Item Created: ${createdVariant?.name || "Item"}`
        }
        description={
          createStep === 1
            ? "Step 1 of 4: Basic details — name, description and dietary type"
            : createStep === 2
              ? "Step 2 of 4: Add the pack sizes (e.g. 250g, 500g) and price for each"
              : createStep === 3
                ? "Step 3 of 4: Upload photos for this item"
                : "Step 4 of 4: See how this item will look to customers"
        }
        size="lg"
      >
        {/* Stepper Progress Bar */}
        <div className="mb-6 flex items-center justify-center gap-2 sm:gap-3 border-b border-[var(--color-neutral-200)] pb-4">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${createStep === 1
              ? "bg-[var(--color-secondary-600)] text-white shadow"
              : "bg-[var(--color-success-100)] text-[var(--color-success-700)]"
              }`}
          >
            {createStep > 1 ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <span>1</span>
            )}
            <span>Item Details</span>
          </div>

          <span className="text-xs text-[var(--color-neutral-400)]">→</span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${createStep === 2
              ? "bg-[var(--color-secondary-600)] text-white shadow"
              : createStep > 2
                ? "bg-[var(--color-success-100)] text-[var(--color-success-700)]"
                : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]"
              }`}
          >
            {createStep > 2 ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <span>2</span>
            )}
            <span>Units & Pricing</span>
          </div>

          <span className="text-xs text-[var(--color-neutral-400)]">→</span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${createStep === 3
              ? "bg-[var(--color-secondary-600)] text-white shadow"
              : createStep > 3
                ? "bg-[var(--color-success-100)] text-[var(--color-success-700)]"
                : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]"
              }`}
          >
            {createStep > 3 ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <span>3</span>
            )}
            <span>Item Images</span>
          </div>

          <span className="text-xs text-[var(--color-neutral-400)]">→</span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${createStep === 4
              ? "bg-[var(--color-secondary-600)] text-white shadow"
              : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]"
              }`}
          >
            <span>4</span>
            <span>Preview</span>
          </div>
        </div>

        {createStep === 1 && (
          <VariantForm
            products={productOptions}
            isLoading={createMutation.isPending}
            submitLabel="Next: Units & Pricing"
            onSubmit={async (formData) => {
              const payload = {
                variantName: formData.variantName,
                slug: formData.slug,
                shortDescription: formData.shortDescription || null,
                description: formData.description || null,
                vegType: formData.vegType,
                isFeatured: formData.isFeatured,
              };

              const res = await createMutation.mutateAsync({
                productUuid: formData.productId!,
                data: payload,
              });

              if (res && res.data) {
                setCreatedVariant({
                  id: res.data.id,
                  productId: res.data.productId,
                  name: res.data.variantName || formData.variantName,
                  variantData: res.data,
                });
                setCreateStep(2);
              }
            }}
          />
        )}

        {createStep === 2 && createdVariant && (
          <div className="space-y-4">

  



            <VariantUnitPriceList
              productUuid={createdVariant.productId}
              variantUuid={createdVariant.id}
            />

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateStep(1)}
                className="h-10 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Back
              </Button>

              <div className="flex items-center gap-2">
                {!hasCreatedPrices ? (
                  <Button
                    type="button"
                    onClick={() => setCreateStep(3)}
                    className="h-10 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-300 hover:bg-neutral-200 px-5 text-sm font-semibold cursor-pointer"
                  >
                    Skip for now (Save as Inactive)
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        await updateMutation.mutateAsync({
                          productUuid: createdVariant.productId,
                          variantUuid: createdVariant.id,
                          data: { isActive: true },
                        });
                      } catch (e) {
                        console.error("Failed to activate variant:", e);
                      }
                      setCreateStep(3);
                    }}
                    className="h-10 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer"
                  >
                    Next: Upload Images
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {createStep === 3 && createdVariant && (
          <VariantImageUploader
            productUuid={createdVariant.productId}
            variantUuid={createdVariant.id}
            variantName={createdVariant.name}
            isStepperMode={true}
            onBack={() => setCreateStep(2)}
            onFinish={() => setCreateStep(4)}
          />
        )}

        {createStep === 4 && createdVariant && (
          <div className="space-y-6">
            {!hasCreatedPrices ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900 text-xs flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">Saved as Inactive (Hidden from Customers)</p>
                  <p className="text-amber-800 mt-0.5">
                    Price details were skipped. This item is safely placed in your <strong>Inactive list</strong>. It will not be shown to customers until you add unit pricing.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-xs flex items-center gap-3">
                <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Item Created Successfully!</p>
                  <p className="text-emerald-700 mt-0.5">
                    Here is how this Item appears to customers on the storefront:
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-center p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div className="w-full max-w-[300px]">
                {createdVariant.variantData && (
                  <VariantCard
                    variant={createdVariant.variantData}
                    showAdminActions={false}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (createdVariant.variantData) {
                    setPreviewVariant(createdVariant.variantData);
                  }
                }}
                className="rounded-xl text-xs font-semibold"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-[var(--color-secondary-600)]" />
                Full Customer Preview
              </Button>
              <Button
                onClick={handleCloseCreateModal}
                className="rounded-xl bg-[var(--color-secondary-600)] px-6 text-xs font-semibold text-white hover:bg-[var(--color-secondary-700)]"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </FormModal>

      {/* EDIT MODAL */}
      <FormModal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedVariant(null);
          refetch();
        }}
        title={`Update Item: ${selectedVariant?.variantName || ""}`}
        description="Update Item details or manage product images"
        size="lg"
      >
        {selectedVariant && (
          <div>
            {/* Tabs for Details vs Images */}
            <div className="flex border-b border-[var(--color-neutral-200)] mb-6">
              <button
                type="button"
                onClick={() => setEditTab("details")}
                disabled={updateMutation.isPending}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${editTab === "details"
                    ? "border-[var(--color-secondary-600)] text-[var(--color-secondary-600)]"
                    : "border-transparent text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-800)]"
                  }`}
              >
                <Package className="h-4 w-4" />
                Item Details
              </button>

              <button
                type="button"
                onClick={() => setEditTab("pricing")}
                disabled={updateMutation.isPending}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${editTab === "pricing"
                    ? "border-[var(--color-secondary-600)] text-[var(--color-secondary-600)]"
                    : "border-transparent text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-800)]"
                  }`}
              >
                <Package className="h-4 w-4" />
                Units & Pricing
              </button>

              <button
                type="button"
                onClick={() => setEditTab("images")}
                disabled={updateMutation.isPending}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${editTab === "images"
                    ? "border-[var(--color-secondary-600)] text-[var(--color-secondary-600)]"
                    : "border-transparent text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-800)]"
                  }`}
              >
                <ImageIcon className="h-4 w-4" />
                Manage Images
              </button>
            </div>

            {editTab === "details" ? (
              <VariantForm
                initialData={{
                  productId: selectedVariant.productId,
                  variantName: selectedVariant.variantName,
                  slug: selectedVariant.slug || "",
                  shortDescription: selectedVariant.shortDescription || "",
                  description: selectedVariant.description || "",
                  vegType: selectedVariant.vegType || "na",
                  isFeatured: selectedVariant.isFeatured ?? false,
                }}
                isEditing
                fixedProductId={selectedVariant.productId}
                products={productOptions}
                isLoading={updateMutation.isPending}
                submitLabel="Update Details"
                onSubmit={async (formData) => {
                  const payload = {
                    variantName: formData.variantName,
                    slug: formData.slug,
                    shortDescription: formData.shortDescription || null,
                    description: formData.description || null,
                    vegType: formData.vegType,
                    isFeatured: formData.isFeatured,
                  };

                  await updateMutation.mutateAsync({
                    productUuid: selectedVariant.productId,
                    variantUuid: selectedVariant.id,
                    data: payload,
                  });

                  setIsEditOpen(false);
                  setSelectedVariant(null);
                  refetch();
                }}
              />
            ) : editTab === "pricing" ? (
              <VariantUnitPriceList
                productUuid={selectedVariant.productId}
                variantUuid={selectedVariant.id}
              />
            ) : (
              <VariantImageUploader
                productUuid={selectedVariant.productId}
                variantUuid={selectedVariant.id}
                variantName={selectedVariant.variantName}
                onFinish={() => {
                  setIsEditOpen(false);
                  setSelectedVariant(null);
                  refetch();
                }}
              />
            )}
          </div>
        )}
      </FormModal>

      {/* CUSTOMER PREVIEW MODAL */}
      <VariantCustomerPreviewModal
        variant={previewVariant}
        isOpen={!!previewVariant}
        onClose={() => setPreviewVariant(null)}
      />

      {/* DELETE DIALOG */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget, {
              onSuccess: () => {
                toast.success("Item Deleted", "Product item removed successfully.");
                setDeleteTarget(null);
                refetch();
              },
              onError: (err: any) => {
                toast.error("Delete Failed", err.message || "Could not delete item.");
              },
            });
          }
        }}
        title="Delete Product Item"
        description="Are you sure you want to delete this product Item? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      {/* BULK DELETE DIALOG */}
      <ConfirmDialog
        open={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={async () => {
          const idsToDelete = selectedRows.map((v) => v.id);
          if (idsToDelete.length === 0) return;
          try {
            await bulkDeleteMutation.mutateAsync(idsToDelete);
            toast.success(
              "Items Deleted",
              `Successfully deleted ${idsToDelete.length} ${idsToDelete.length === 1 ? "item" : "items"}.`
            );
            setSelectedRowIds({});
            setSelectedRows([]);
            setIsBulkDeleteOpen(false);
            refetch();
          } catch (err: any) {
            toast.error("Delete Failed", err.message || "Could not delete selected items.");
          }
        }}
        title={`Delete ${selectedRows.length} Selected ${selectedRows.length === 1 ? "Item" : "Items"}`}
        description={`Are you sure you want to delete ${selectedRows.length} selected ${selectedRows.length === 1 ? "item" : "items"}${activeProductName ? ` belonging to "${activeProductName}"` : ""}? This will permanently remove these items, pricing, and inventories. This action cannot be undone.`}
        confirmText={`Delete ${selectedRows.length} ${selectedRows.length === 1 ? "Item" : "Items"}`}
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}

