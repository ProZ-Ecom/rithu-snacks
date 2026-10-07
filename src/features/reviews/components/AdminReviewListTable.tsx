"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  Eye,
  Trash2,
  Star,
  User,
  RotateCcw,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { exportToExcel } from "@/lib/excel-export";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/utils";
import { ReviewRatingStars } from "./ReviewRatingStars";
import { ReviewStatusBadge } from "./ReviewStatusBadge";
import { ReviewStatusTabs, type ReviewStatusTab } from "./ReviewStatusTabs";
import { AdminReviewDetailModal } from "./AdminReviewDetailModal";
import {
  useAdminReviews,
  useUpdateReviewStatus,
  useDeleteAdminReview,
} from "../hooks/use-admin-reviews";
import { getAdminReviews } from "../api/admin-reviews.api";
import type { ReviewResponse } from "../types/review.types";

const RATING_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All Stars" },
  { value: "5", label: "5 Stars (★★★★★)" },
  { value: "4", label: "4 Stars (★★★★☆)" },
  { value: "3", label: "3 Stars (★★★☆☆)" },
  { value: "2", label: "2 Stars (★★☆☆☆)" },
  { value: "1", label: "1 Star (★☆☆☆☆)" },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: "createdAt_desc", label: "Newest First" },
  { value: "createdAt_asc", label: "Oldest First" },
  { value: "rating_desc", label: "Highest Rating" },
  { value: "rating_asc", label: "Lowest Rating" },
];

interface AdminReviewListTableProps {
  initialStatus?: "all" | "approved" | "unapproved";
  initialProductId?: string;
  initialVariantId?: string;
}

export function AdminReviewListTable({
  initialStatus = "all",
  initialProductId,
  initialVariantId,
}: AdminReviewListTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "unapproved">(
    initialStatus
  );
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selected review for modal details & delete modal
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewResponse | null>(null);

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<ReviewResponse[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, statusFilter, ratingFilter, sortBy, sortOrder, page, pageSize]);

  // Map tab filter to backend isApproved boolean
  const isApprovedQuery =
    statusFilter === "all" ? undefined : statusFilter === "approved";

  const { data, isLoading, error, refetch, isFetching } = useAdminReviews({
    page,
    limit: pageSize,
    search: search.trim() || undefined,
    isApproved: isApprovedQuery,
    rating: ratingFilter,
    productId: initialProductId,
    variantId: initialVariantId,
    sortBy,
    sortOrder,
  });

  const updateStatusMutation = useUpdateReviewStatus();
  const deleteMutation = useDeleteAdminReview();

  const reviews = data?.data ?? [];
  const meta = data?.meta;

  const handleTabChange = (tabId: "all" | "approved" | "unapproved") => {
    setStatusFilter(tabId);
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" || ratingFilter !== undefined || statusFilter !== "all";

  const handleClearFilters = () => {
    setSearch("");
    setRatingFilter(undefined);
    setStatusFilter("all");
    setPage(1);
  };

  const handleRatingChange = (newRating: string) => {
    setRatingFilter(newRating === "all" ? undefined : Number(newRating));
    setPage(1);
  };

  const handleSortChange = (newSort: string) => {
    if (newSort === "createdAt_desc") {
      setSortBy("createdAt");
      setSortOrder("desc");
    } else if (newSort === "createdAt_asc") {
      setSortBy("createdAt");
      setSortOrder("asc");
    } else if (newSort === "rating_desc") {
      setSortBy("rating");
      setSortOrder("desc");
    } else if (newSort === "rating_asc") {
      setSortBy("rating");
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleQuickStatusToggle = async (review: ReviewResponse, isApproved: boolean) => {
    await updateStatusMutation.mutateAsync({
      reviewId: review.id,
      isApproved,
    });
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete?.id) return;
    await deleteMutation.mutateAsync(reviewToDelete.id);
    setReviewToDelete(null);

    // If deleting the last item on the page, navigate back one page if possible
    if (reviews.length === 1 && page > 1) {
      setPage(page - 1);
    }
  };

  const tabs: ReviewStatusTab[] = [
    { id: "all", label: "All Reviews" },
    { id: "approved", label: "Approved" },
    { id: "unapproved", label: "Pending / Unapproved" },
  ];

  const columns: ColumnDef<ReviewResponse, unknown>[] = [
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const review = row.original;
        const customer = review.customer;

        return (
          <div className="flex items-center gap-2.5 min-w-[170px]">
            <div className="w-8 h-8 rounded-full bg-cream-200 border border-cream-border relative overflow-hidden flex items-center justify-center text-neutral-400 shrink-0">
              {customer?.avatar ? (
                <Image
                  src={customer.avatar}
                  alt={customer.name || "Customer"}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-neutral-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-neutral-900 truncate">
                {customer?.name || "Verified Customer"}
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "product",
      header: "Product / Variant",
      cell: ({ row }) => {
        const review = row.original;
        const product = review.product;
        const variant = review.variant;

        return (
          <div className="min-w-[190px] space-y-1">
            <div className="font-semibold text-xs text-neutral-900 hover:text-secondary-600 truncate">
              {product?.name || "Product"}
            </div>
            {variant && (
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                <span className="font-mono bg-cream-200 px-1.5 py-0.5 rounded border border-cream-border-subtle text-[10px] text-neutral-700">
                  {variant.sku}
                </span>
                {variant.name && (
                  <span className="truncate max-w-[120px]">{variant.name}</span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "Rating & Feedback",
      cell: ({ row }) => {
        const review = row.original;
        const hasImages = Array.isArray(review.images) && review.images.length > 0;

        return (
          <div className="min-w-[240px] max-w-[340px] space-y-1 py-1">
            <div className="flex items-center gap-2">
              <ReviewRatingStars rating={review.rating} size="xs" />
              {hasImages && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cream-200 text-neutral-600 text-[10px] font-medium border border-cream-border">
                  <ImageIcon className="w-2.5 h-2.5" />
                  <span>{review.images.length}</span>
                </span>
              )}
            </div>

            {review.title && (
              <div className="text-xs font-bold text-neutral-900 truncate">
                {review.title}
              </div>
            )}

            <div className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
              {review.comment || (
                <span className="italic text-neutral-400">No review text</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const review = row.original;
        return <ReviewStatusBadge isApproved={Boolean(review.isApproved)} size="sm" />;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const review = row.original;
        const isActionLoading =
          (updateStatusMutation.isPending &&
            updateStatusMutation.variables?.reviewId === review.id) ||
          (deleteMutation.isPending &&
            deleteMutation.variables === review.id);

        return (
          <div className="flex items-center justify-center gap-1.5">
            {/* Quick Toggle Approve / Unapprove Button */}
            {review.isApproved ? (
              <button
                type="button"
                onClick={() => handleQuickStatusToggle(review, false)}
                disabled={isActionLoading}
                className="w-7 h-7 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Unapprove review"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleQuickStatusToggle(review, true)}
                disabled={isActionLoading}
                className="w-7 h-7 rounded-lg border border-success-200 bg-success-50 hover:bg-success-100 text-success-700 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Approve review"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* View Full Details Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedReview(review);
                setIsDetailModalOpen(true);
              }}
              className="w-7 h-7 rounded-lg border border-cream-border bg-white hover:bg-secondary-50 text-neutral-700 hover:text-secondary-600 flex items-center justify-center transition-colors cursor-pointer"
              title="View full review details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Delete Review Button */}
            <button
              type="button"
              onClick={() => setReviewToDelete(review)}
              disabled={isActionLoading}
              className="w-7 h-7 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              title="Delete review"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] rounded-2xl">
      {/* Top Filter and Controls Bar */}
      <div className="flex-shrink-0 mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Side: Search, Rating Filter & Sort */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full lg:w-auto">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by customer, text..."
              className="h-9.5 text-xs"
            />
          </div>

          {/* Rating Dropdown Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={ratingFilter === undefined ? "all" : String(ratingFilter)}
              onValueChange={(val) => handleRatingChange(val)}
              options={RATING_FILTER_OPTIONS}
              size="sm"
              className="h-9.5 rounded-xl font-semibold"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="w-full sm:w-40">
            <Select
              value={`${sortBy}_${sortOrder}`}
              onValueChange={(val) => handleSortChange(val)}
              options={SORT_OPTIONS}
              size="sm"
              className="h-9.5 rounded-xl font-semibold"
            />
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9.5 border-cream-border hover:bg-cream-100 text-neutral-700 px-3 shrink-0"
            title="Refresh review list"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-secondary-600" : ""}`}
            />
          </Button>

          <ExportExcelButton
            data={reviews}
            fetchData={async () => {
              const res = await getAdminReviews({
                page: 1,
                limit: 10000,
                search: search.trim() || undefined,
                isApproved: isApprovedQuery,
                rating: ratingFilter,
                productId: initialProductId,
                variantId: initialVariantId,
                sortBy,
                sortOrder,
              });
              return res?.data ?? [];
            }}
            totalCount={meta?.total ?? reviews.length}
            filename="reviews"
            sheetName="Reviews"
            columns={EXPORT_PRESETS.reviews}
            className="h-9.5"
          />

          {hasActiveFilters && <ClearFiltersButton onClick={handleClearFilters} className="h-9.5" />}
        </div>

        {/* Right Side: Status Tabs (Segmented) */}
        <div className="w-full lg:w-auto overflow-x-auto">
          <ReviewStatusTabs
            tabs={tabs}
            activeTab={statusFilter}
            onChange={handleTabChange}
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-cream-border bg-white p-12">
            <LoadingState text="Loading reviews..." />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-cream-border bg-white p-12">
            <ErrorState
              title="Failed to load reviews"
              message={(error as Error)?.message || "Please check your network and try again"}
              onRetry={() => refetch()}
            />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-cream-border bg-white p-12 text-center">
            <div>
              <Star className="mx-auto h-10 w-10 text-neutral-300 stroke-1" />
              <h3 className="mt-3 text-sm font-bold text-neutral-900">
                No reviews found
              </h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "No reviews match your current search or filter criteria."
                  : "No customer reviews have been submitted yet."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-4 text-xs font-semibold"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="review"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_reviews",
                  sheetName: "Selected Reviews",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.reviews,
                });
              }}
            />

            <DataTable
              columns={columns}
              data={reviews}
              page={meta?.page ?? page}
              pageSize={meta?.limit ?? pageSize}
              totalItems={meta?.total ?? reviews.length}
              totalPages={meta?.totalPages ?? (Math.ceil(reviews.length / pageSize) || 1)}
              onPageChange={(newPage) => setPage(newPage)}
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
              className="bg-white border border-cream-border shadow-2xs"
            />
          </>
        )}
      </div>

      {/* Review Details Modal */}
      {selectedReview && (
        <AdminReviewDetailModal
          reviewId={selectedReview.id}
          initialReview={selectedReview}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedReview(null);
          }}
          onDeleted={() => {
            refetch();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(reviewToDelete)}
        onClose={() => setReviewToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Review?"
        description={`Are you sure you want to permanently delete this review for "${reviewToDelete?.product?.name || "this product"}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
