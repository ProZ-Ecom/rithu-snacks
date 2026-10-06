"use client";

import { useMemo, useState } from "react";
import { Calendar, Eye, Pencil, Plus, Power, Tag, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/forms/label";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import {
  AdminContent,
  AdminPageHeader,
} from "@/components/admin/AdminPageHeader";
import { FormModal } from "@/components/common/FormModal";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import {
  useCreateOffer,
  useDeleteOffer,
  useOfferCategories,
  useOfferProductTargets,
  useOffers,
  useToggleOfferStatus,
  useUpdateOffer,
} from "@/features/offers/hooks";
import { OfferDetails, OfferForm } from "@/features/offers/components";
import {
  OFFER_LEVEL_LABELS,
  OFFER_LEVEL_OPTIONS,
  OFFER_STATUS_BADGE,
  OFFER_STATUS_LABELS,
  OFFER_TYPE_BADGE,
  OFFER_TYPE_LABELS,
  OFFER_TYPE_OPTIONS,
  formatOfferDiscount,
  formatOfferValidity,
} from "@/features/offers/constants/offer-options";
import type { CreateOfferSchemaInput } from "@/features/offers/validations/offer.schema";
import type {
  OfferLevel,
  OfferListItem,
  OfferStatusFilter,
  OfferType,
} from "@/features/offers/types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Turns an API failure into the message the admin should actually read. */
function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

interface OfferFilters {
  search: string;
  level: "" | OfferLevel;
  type: "" | OfferType;
  status: "" | OfferStatusFilter;
  categoryId: string;
  productId: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FILTERS: OfferFilters = {
  search: "",
  level: "",
  type: "",
  status: "",
  categoryId: "",
  productId: "",
  startDate: "",
  endDate: "",
};

export default function AdminOffersPage() {
  const [filters, setFilters] = useState<OfferFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const setFilter = <K extends keyof OfferFilters>(
    key: K,
    value: OfferFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferListItem | null>(null);
  const [viewingOffer, setViewingOffer] = useState<OfferListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OfferListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<OfferListItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useOffers({
    page,
    limit: pageSize,
    search: filters.search || undefined,
    level: filters.level || undefined,
    type: filters.type || undefined,
    status: filters.status || undefined,
    categoryId: filters.categoryId || undefined,
    productId: filters.productId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  const { data: categories = [] } = useOfferCategories();
  const { data: products = [] } = useOfferProductTargets({
    categoryId: filters.categoryId || undefined,
  });

  const createMutation = useCreateOffer();
  const updateMutation = useUpdateOffer();
  const statusMutation = useToggleOfferStatus();
  const deleteMutation = useDeleteOffer();

  const offers = data?.data ?? [];

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  const productOptions = useMemo(
    () => [
      { value: "", label: "All products" },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products]
  );

  const hasActiveFilters = Object.values(filters).some(
    (value) => value.trim() !== ""
  );

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleCreate = async (formData: CreateOfferSchemaInput) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync(formData as Record<string, unknown>);
      setIsCreateOpen(false);
    } catch (err) {
      setFormError(errorMessage(err, "Could not create the offer."));
    }
  };

  const handleUpdate = async (formData: CreateOfferSchemaInput) => {
    if (!editingOffer) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
        id: editingOffer.id,
        data: formData as Record<string, unknown>,
      });
      setEditingOffer(null);
    } catch (err) {
      setFormError(errorMessage(err, "Could not update the offer."));
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    const nextActive = !statusTarget.isActive;
    try {
      await statusMutation.mutateAsync({ id: statusTarget.id, isActive: nextActive });
    } catch {
      // Error toast handled by MutationCache
    } finally {
      setStatusTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
    } catch {
      // Error toast handled by MutationCache
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: ColumnDef<OfferListItem>[] = [
    {
      accessorKey: "name",
      header: "Offer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-neutral-900">
            {row.original.name}
          </span>
          {row.original.code && (
            <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-neutral-500">
              <Tag className="h-3 w-3" />
              {row.original.code}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {OFFER_LEVEL_LABELS[row.original.level]}
        </Badge>
      ),
    },
    {
      id: "targets",
      header: "Category / Product / Item",
      cell: ({ row }) => {
        const offer = row.original;
        if (offer.level === "product") {
          const [first, ...rest] = offer.products;
          if (!first) return <span className="text-xs text-neutral-400">—</span>;
          return (
            <div className="min-w-0">
              <span className="block truncate text-sm text-neutral-800">
                {first.name}
                {rest.length > 0 && ` +${rest.length} more`}
              </span>
              <span className="block truncate text-xs text-neutral-500">
                {first.categoryName ?? "Uncategorised"}
              </span>
            </div>
          );
        }

        const [first, ...rest] = offer.items;
        if (!first) return <span className="text-xs text-neutral-400">—</span>;
        return (
          <div className="min-w-0">
            <span className="block truncate text-sm text-neutral-800">
              {first.label || first.sku}
              {rest.length > 0 && ` +${rest.length} more`}
            </span>
            <span className="block truncate text-xs text-neutral-500">
              SKU {first.sku}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={OFFER_TYPE_BADGE[row.original.type]} className="text-xs whitespace-nowrap">
          {OFFER_TYPE_LABELS[row.original.type]}
        </Badge>
      ),
    },
    {
      id: "discount",
      header: "Discount",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm font-semibold text-neutral-900">
          {formatOfferDiscount(row.original)}
        </span>
      ),
    },
    {
      id: "validity",
      header: "Validity",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-neutral-600">
          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
          {formatOfferValidity(row.original.startsAt, row.original.endsAt)}
        </div>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-700">{row.original.priority}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={OFFER_STATUS_BADGE[row.original.status]} className="text-xs">
          {OFFER_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const offer = row.original;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewingOffer(offer)}
              className="h-8 w-8 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              title="View offer"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFormError(null);
                setEditingOffer(offer);
              }}
              className="h-8 w-8 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              title="Edit offer"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStatusTarget(offer)}
              className={
                offer.isActive
                  ? "h-8 w-8 text-amber-600 hover:bg-amber-50"
                  : "h-8 w-8 text-emerald-600 hover:bg-emerald-50"
              }
              title={offer.isActive ? "Deactivate offer" : "Activate offer"}
            >
              <Power className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(offer)}
              className="h-8 w-8 text-[var(--color-error-500)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-700)]"
              title="Delete offer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading && !data) {
    return <AdminTableSkeleton />;
  }

  if (error) {
    return <ErrorState message="Failed to load offers" onRetry={() => refetch()} />;
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Offers"
        description="Create product-wise and item-wise offers, and control which one wins when several apply."
      />

      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          {/* Top Search + Filter Controls + Add Button */}
          <div className="flex-shrink-0 space-y-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
                <SearchInput
                  placeholder="Search offers by name or code..."
                  defaultValue={filters.search}
                  onSearch={(value) => setFilter("search", value)}
                  className="w-full max-w-md"
                />
                {hasActiveFilters && <ClearFiltersButton onClick={clearFilters} />}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
                <ExportExcelButton
                  data={offers}
                  filename="offers"
                  sheetName="Offers"
                  columns={EXPORT_PRESETS.offers}
                />

                <Button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setIsCreateOpen(true);
                  }}
                  className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer shadow-xs"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Offer
                </Button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-36">
                <Select
                  value={filters.level}
                  options={[{ value: "", label: "All levels" }, ...OFFER_LEVEL_OPTIONS]}
                  placeholder="All levels"
                  className="h-11 rounded-xl"
                  onValueChange={(value) => setFilter("level", value as "" | OfferLevel)}
                />
              </div>

              <div className="w-full sm:w-36">
                <Select
                  value={filters.type}
                  options={[{ value: "", label: "All types" }, ...OFFER_TYPE_OPTIONS]}
                  placeholder="All types"
                  className="h-11 rounded-xl"
                  onValueChange={(value) => setFilter("type", value as "" | OfferType)}
                />
              </div>

              <div className="w-full sm:w-36">
                <Select
                  value={filters.status}
                  options={[
                    { value: "", label: "All statuses" },
                    { value: "active", label: "Active" },
                    { value: "scheduled", label: "Scheduled" },
                    { value: "expired", label: "Expired" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  placeholder="All statuses"
                  className="h-11 rounded-xl"
                  onValueChange={(value) =>
                    setFilter("status", value as "" | OfferStatusFilter)
                  }
                />
              </div>

              <div className="w-full sm:w-44">
                <Select
                  value={filters.categoryId}
                  options={categoryOptions}
                  placeholder="All categories"
                  className="h-11 rounded-xl"
                  onValueChange={(value) => {
                    setFilters((prev) => ({
                      ...prev,
                      categoryId: value,
                      productId: "",
                    }));
                    setPage(1);
                  }}
                />
              </div>

              <div className="w-full sm:w-44">
                <Select
                  value={filters.productId}
                  options={productOptions}
                  placeholder="All products"
                  className="h-11 rounded-xl"
                  onValueChange={(value) => setFilter("productId", value)}
                />
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 bg-white border border-theme-border rounded-xl px-3 h-11 shadow-2xs hover:border-theme-border-accent transition-colors">
                  <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">From:</span>
                  <input
                    id="offer-from"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilter("startDate", e.target.value)}
                    className="text-xs bg-transparent outline-none text-neutral-800 cursor-pointer min-w-[125px]"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-theme-border rounded-xl px-3 h-11 shadow-2xs hover:border-theme-border-accent transition-colors">
                  <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">To:</span>
                  <input
                    id="offer-to"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilter("endDate", e.target.value)}
                    className="text-xs bg-transparent outline-none text-neutral-800 cursor-pointer min-w-[125px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <DataTable
              columns={columns}
              data={offers}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={data?.meta?.totalPages ?? 1}
              totalItems={data?.meta?.total ?? offers.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              emptyMessage={
                hasActiveFilters
                  ? "No offers match these filters."
                  : "No offers yet. Create your first one to start discounting."
              }
              className={isFetching ? "bg-white opacity-70 transition-opacity" : "bg-white"}
            />
          </div>
        </div>
      </AdminContent>

      {/* Create */}
      <FormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Offer"
        description="Choose what the offer covers, how it discounts, and when it runs."
        size="xl"
      >
        <OfferForm
          isLoading={createMutation.isPending}
          submitLabel="Create Offer"
          serverError={formError}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
        />
      </FormModal>

      {/* Edit */}
      <FormModal
        open={Boolean(editingOffer)}
        onClose={() => setEditingOffer(null)}
        title="Edit Offer"
        description="Changes apply to the storefront as soon as they are saved."
        size="xl"
      >
        {editingOffer && (
          <OfferForm
            key={editingOffer.id}
            initialData={editingOffer}
            isLoading={updateMutation.isPending}
            submitLabel="Update Offer"
            serverError={formError}
            onCancel={() => setEditingOffer(null)}
            onSubmit={handleUpdate}
          />
        )}
      </FormModal>

      {/* View */}
      <FormModal
        open={Boolean(viewingOffer)}
        onClose={() => setViewingOffer(null)}
        title={viewingOffer?.name ?? "Offer"}
        description="Everything this offer covers and how it discounts."
        size="lg"
      >
        {viewingOffer && <OfferDetails offer={viewingOffer} />}
      </FormModal>

      {/* Activate / deactivate */}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleToggleStatus}
        isLoading={statusMutation.isPending}
        variant={statusTarget?.isActive ? "destructive" : "default"}
        title={statusTarget?.isActive ? "Deactivate this offer?" : "Activate this offer?"}
        description={
          statusTarget?.isActive
            ? `"${statusTarget?.name}" will stop applying to new carts immediately. Orders already placed are unaffected.`
            : `"${statusTarget?.name}" will start applying as soon as its start date is reached.`
        }
        confirmText={statusTarget?.isActive ? "Deactivate" : "Activate"}
      />

      {/* Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title="Delete this offer?"
        description={`"${deleteTarget?.name}" will be removed and will stop applying to carts. Orders already placed keep the discount they were given.`}
        confirmText="Delete Offer"
        variant="destructive"
      />
    </div>
  );
}
