"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Star,
  MessageSquareQuote,
  User,
  Calendar,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  useAdminReviews,
  useUpdateReviewStatus,
  useDeleteAdminReview,
} from "@/features/reviews/hooks/use-admin-reviews";
import { ReviewRatingStars } from "@/features/reviews/components/ReviewRatingStars";
import { ReviewStatusBadge } from "@/features/reviews/components/ReviewStatusBadge";
import { ReviewStatusTabs, type ReviewStatusTab } from "@/features/reviews/components/ReviewStatusTabs";
import { AdminReviewDetailModal } from "@/features/reviews/components/AdminReviewDetailModal";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";
import type { ReviewResponse } from "@/features/reviews/types/review.types";
import type { AdminVariantResponse } from "../types";

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

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: "5", label: "5 / page" },
  { value: "10", label: "10 / page" },
  { value: "20", label: "20 / page" },
];

export interface VariantReviewsCardProps {
  variant: AdminVariantResponse | null;
  className?: string;
}

export function VariantReviewsCard({
  variant,
  className,
}: VariantReviewsCardProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "unapproved">("all");
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals & Image Lightbox state
  const [selectedReview, setSelectedReview] = useState<ReviewResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewResponse | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const isApprovedQuery =
    statusFilter === "all" ? undefined : statusFilter === "approved";

  // Fetch reviews filtered specifically for this variant
  const { data, isLoading, error, refetch, isFetching } = useAdminReviews({
    page,
    limit: pageSize,
    variantId: variant?.id || undefined,
    search: search.trim() || undefined,
    isApproved: isApprovedQuery,
    rating: ratingFilter,
    sortBy,
    sortOrder,
  });

  const updateStatusMutation = useUpdateReviewStatus();
  const deleteMutation = useDeleteAdminReview();

  const reviews = data?.data ?? [];
  const meta = data?.meta;
  const totalItems = meta?.total ?? reviews.length;
  const totalPages = meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));

  // Compute rating metrics & star breakdown
  const stats = useMemo(() => {
    if (!reviews.length) {
      return {
        avgRating: 0,
        approvedCount: 0,
        unapprovedCount: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      };
    }

    let sumRating = 0;
    let approved = 0;
    let unapproved = 0;
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((r) => {
      sumRating += Number(r.rating) || 0;
      if (r.isApproved) approved++;
      else unapproved++;

      const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0)));
      dist[star] = (dist[star] || 0) + 1;
    });

    const avg = reviews.length > 0 ? Number((sumRating / reviews.length).toFixed(1)) : 0;

    return {
      avgRating: avg,
      approvedCount: approved,
      unapprovedCount: unapproved,
      distribution: dist,
    };
  }, [reviews]);

  const handleTabChange = (tabId: "all" | "approved" | "unapproved") => {
    setStatusFilter(tabId);
    setPage(1);
  };

  const handleRatingFilterChange = (star: number | undefined) => {
    setRatingFilter((prev) => (prev === star ? undefined : star));
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    if (value === "createdAt_desc") {
      setSortBy("createdAt");
      setSortOrder("desc");
    } else if (value === "createdAt_asc") {
      setSortBy("createdAt");
      setSortOrder("asc");
    } else if (value === "rating_desc") {
      setSortBy("rating");
      setSortOrder("desc");
    } else if (value === "rating_asc") {
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

    if (reviews.length === 1 && page > 1) {
      setPage(page - 1);
    }
  };

  const tabs: ReviewStatusTab[] = [
    { id: "all", label: "All Reviews" },
    { id: "approved", label: "Approved" },
    { id: "unapproved", label: "Pending / Unapproved" },
  ];

  const startEntry = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endEntry = totalItems > 0 ? Math.min(page * pageSize, totalItems) : 0;

  return (
    <div
      className={cn(
        "bg-white border border-cream-border rounded-2xl overflow-hidden shadow-xs space-y-0",
        className
      )}
    >
      {/* Card Header */}
      <div className="px-6 py-4.5 border-b border-cream-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary-50 border border-secondary-100 flex items-center justify-center text-secondary-600">
            <MessageSquareQuote className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-neutral-900 tracking-tight">
                Customer Reviews & Ratings
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cream-200 text-neutral-700 border border-cream-border">
                {totalItems} {totalItems === 1 ? "review" : "reviews"}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Customer feedback and star ratings submitted specifically for this variant
            </p>
          </div>
        </div>

        {/* Refresh & Quick Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8.5 text-xs border-cream-border bg-white hover:bg-cream-100 text-neutral-700 cursor-pointer"
            title="Refresh reviews"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin text-secondary-600" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Rating Summary Banner */}
      {totalItems > 0 && (
        <div className="p-6 bg-cream-50/70 border-b border-cream-border">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Big Score Box */}
            <div className="md:col-span-4 flex items-center gap-4 border-b md:border-b-0 md:border-r border-cream-border pb-4 md:pb-0 md:pr-6">
              <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-cream-border shadow-2xs min-w-[90px]">
                <span className="text-3xl font-black text-neutral-900 tracking-tight">
                  {stats.avgRating > 0 ? stats.avgRating : "—"}
                </span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                  Out of 5
                </span>
              </div>
              <div className="space-y-1.5">
                <ReviewRatingStars rating={stats.avgRating} size="md" />
                <div className="text-xs text-neutral-600 font-medium">
                  Based on <span className="font-bold text-neutral-900">{totalItems}</span> ratings
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span className="inline-flex items-center gap-1 text-success-700 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    {stats.approvedCount} approved
                  </span>
                  {stats.unapprovedCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        {stats.unapprovedCount} pending
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Interactive Star Distribution Bars */}
            <div className="md:col-span-8 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star] || 0;
                const percentage = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
                const isSelected = ratingFilter === star;

                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingFilterChange(star)}
                    className={cn(
                      "w-full flex items-center gap-3 text-xs py-0.5 px-2 rounded-lg transition-colors cursor-pointer text-left group",
                      isSelected
                        ? "bg-secondary-100/70 text-secondary-900 font-bold"
                        : "hover:bg-cream-100 text-neutral-600"
                    )}
                    title={`Filter by ${star} star reviews`}
                  >
                    <div className="flex items-center gap-1 w-14 shrink-0 font-medium text-neutral-700">
                      <span>{star}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </div>

                    <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden relative">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isSelected ? "bg-secondary-600" : "bg-amber-400 group-hover:bg-amber-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="w-12 text-right shrink-0 text-[11px] font-mono text-neutral-500">
                      {count} ({percentage}%)
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Controls Toolbar */}
      <div className="p-4 sm:p-5 border-b border-cream-border flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white">
        {/* Search, Rating & Sort */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search customer, comment..."
              className="h-9 text-xs"
            />
          </div>

          {/* Star Filter Dropdown */}
          <div className="w-full sm:w-44">
            <Select
              value={ratingFilter === undefined ? "all" : String(ratingFilter)}
              onValueChange={(val) => {
                setRatingFilter(val === "all" ? undefined : Number(val));
                setPage(1);
              }}
              options={RATING_FILTER_OPTIONS}
              size="sm"
              className="h-9 rounded-xl font-semibold"
            />
          </div>

          {/* Sort Selector */}
          <div className="w-full sm:w-40">
            <Select
              value={`${sortBy}_${sortOrder}`}
              onValueChange={(val) => handleSortChange(val)}
              options={SORT_OPTIONS}
              size="sm"
              className="h-9 rounded-xl font-semibold"
            />
          </div>
        </div>

        {/* Status Segmented Tabs */}
        <div className="w-full lg:w-auto overflow-x-auto">
          <ReviewStatusTabs
            tabs={tabs}
            activeTab={statusFilter}
            onChange={handleTabChange}
          />
        </div>
      </div>

      {/* Review List Body */}
      <div>
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingState text="Loading variant customer reviews..." />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState
              title="Failed to load reviews"
              message={(error as Error)?.message || "Please check your network and try again"}
              onRetry={() => refetch()}
            />
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center text-neutral-400 mx-auto mb-3">
              <Star className="w-6 h-6 stroke-1" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">
              No customer reviews found
            </h3>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
              {search || ratingFilter || statusFilter !== "all"
                ? "No reviews match your current filter or search criteria."
                : "No customer reviews have been submitted for this variant yet."}
            </p>
            {(search || ratingFilter || statusFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setRatingFilter(undefined);
                  setStatusFilter("all");
                  setPage(1);
                }}
                className="mt-4 text-xs font-semibold"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-cream-border">
            {reviews.map((review) => {
              const isActionLoading =
                (updateStatusMutation.isPending &&
                  updateStatusMutation.variables?.reviewId === review.id) ||
                (deleteMutation.isPending &&
                  deleteMutation.variables === review.id);

              const formattedDate = review.createdAt
                ? new Date(review.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—";

              const hasImages = Array.isArray(review.images) && review.images.length > 0;

              return (
                <div
                  key={review.id}
                  className="p-5 sm:p-6 hover:bg-cream-50/50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  {/* Left: Customer Info, Star Rating, Title & Comment, Images */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Customer Header Row */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cream-200 border border-cream-border relative overflow-hidden flex items-center justify-center text-neutral-400 shrink-0">
                        {review.customer?.avatar ? (
                          <Image
                            src={review.customer.avatar}
                            alt={review.customer.name || "Customer"}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-neutral-900">
                            {review.customer?.name || "Verified Customer"}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified Buyer
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating & Status Badge */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <ReviewRatingStars rating={review.rating} size="sm" showScore />
                      <ReviewStatusBadge isApproved={Boolean(review.isApproved)} size="sm" />
                    </div>

                    {/* Review Title */}
                    {review.title && (
                      <h4 className="text-sm font-bold text-neutral-900">
                        {review.title}
                      </h4>
                    )}

                    {/* Review Comment Text */}
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed max-w-3xl">
                      {review.comment || (
                        <span className="italic text-neutral-400">No review commentary provided.</span>
                      )}
                    </p>

                    {/* Customer Photos Gallery */}
                    {hasImages && (
                      <div className="pt-1">
                        <p className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1 mb-2">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Customer Photos ({review.images.length}):</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {review.images.map((imgUrl, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => setEnlargedImage(imgUrl)}
                              className="relative w-14 h-14 rounded-xl border border-cream-border overflow-hidden group hover:border-secondary-600 transition-all cursor-pointer shadow-2xs"
                              title="Click to view enlarged photo"
                            >
                              <Image
                                src={imgUrl}
                                alt={`Customer review photo ${imgIdx + 1}`}
                                fill
                                sizes="56px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Moderation Action Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-1">
                    {/* Quick Status Toggle Button */}
                    {review.isApproved ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickStatusToggle(review, false)}
                        disabled={isActionLoading}
                        className="h-8 text-xs border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold cursor-pointer"
                        title="Unapprove this review"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        <span>Unapprove</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickStatusToggle(review, true)}
                        disabled={isActionLoading}
                        className="h-8 text-xs border-success-200 bg-success-50 hover:bg-success-100 text-success-700 font-semibold cursor-pointer"
                        title="Approve this review"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Approve</span>
                      </Button>
                    )}

                    {/* View Details Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReview(review);
                        setIsDetailModalOpen(true);
                      }}
                      className="h-8 w-8 rounded-lg border border-cream-border bg-white hover:bg-secondary-50 text-neutral-700 hover:text-secondary-700 flex items-center justify-center transition-colors cursor-pointer"
                      title="View full review and order item details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Review Button */}
                    <button
                      type="button"
                      onClick={() => setReviewToDelete(review)}
                      disabled={isActionLoading}
                      className="h-8 w-8 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-t border-cream-border bg-white">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-neutral-500">
            <p>
              Showing {startEntry}–{endEntry} of {totalItems} reviews
            </p>
            <div className="flex items-center gap-2">
              <span className="text-neutral-600 font-medium whitespace-nowrap">
                Per page:
              </span>
              <div className="w-28">
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                  options={PAGE_SIZE_OPTIONS}
                  size="sm"
                  placement="top"
                  className="h-8 rounded-lg font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-2.5 text-xs border-cream-border bg-white hover:bg-cream-100"
            >
              Previous
            </Button>
            <span className="text-xs font-semibold text-neutral-700 px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 px-2.5 text-xs border-cream-border bg-white hover:bg-cream-100"
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
        description={`Are you sure you want to permanently delete this review from "${reviewToDelete?.customer?.name || "Customer"}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      {/* Customer Image Lightbox Modal */}
      <Modal
        open={Boolean(enlargedImage)}
        onClose={() => setEnlargedImage(null)}
        title="Customer Photo Preview"
        className="max-w-xl p-4"
      >
        {enlargedImage && (
          <div className="space-y-4">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-cream-border">
              <Image
                src={enlargedImage}
                alt="Enlarged customer photo"
                fill
                sizes="(max-width: 768px) 100vw, 550px"
                className="object-contain"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnlargedImage(null)}
                className="text-xs"
              >
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
