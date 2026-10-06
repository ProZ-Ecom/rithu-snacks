"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Package,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  MessageSquareQuote,
  ShoppingBag,
  Clock,
  X,
  Maximize2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/utils";
import { ReviewRatingStars } from "./ReviewRatingStars";
import { ReviewStatusBadge } from "./ReviewStatusBadge";
import {
  useAdminReview,
  useUpdateReviewStatus,
  useDeleteAdminReview,
} from "../hooks/use-admin-reviews";
import type { ReviewResponse } from "../types/review.types";

interface AdminReviewDetailModalProps {
  reviewId: string | null;
  initialReview?: ReviewResponse | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function AdminReviewDetailModal({
  reviewId,
  initialReview,
  open,
  onClose,
  onDeleted,
}: AdminReviewDetailModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Fetch full details if reviewId provided
  const { data: fetchedReview, isLoading } = useAdminReview(reviewId);
  const review = fetchedReview || initialReview;

  const updateStatusMutation = useUpdateReviewStatus();
  const deleteMutation = useDeleteAdminReview();

  const handleStatusToggle = async (isApproved: boolean) => {
    if (!review?.id) return;
    await updateStatusMutation.mutateAsync({
      reviewId: review.id,
      isApproved,
    });
  };

  const handleDelete = async () => {
    if (!review?.id) return;
    await deleteMutation.mutateAsync(review.id);
    setIsConfirmDeleteOpen(false);
    onClose();
    onDeleted?.();
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Review Details"
        description="View customer feedback, ratings, and moderate status"
        className="max-w-2xl"
      >
        {isLoading && !review ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-secondary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-neutral-500">Loading review details...</p>
          </div>
        ) : !review ? (
          <div className="py-12 text-center text-neutral-500 text-sm">
            Review information not found.
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Header: Customer info & Status Badge */}
            <div className="p-4 rounded-2xl bg-cream-100 border border-cream-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-cream-200 border border-cream-border relative overflow-hidden flex items-center justify-center text-neutral-400 shrink-0">
                  {review.customer?.avatar ? (
                    <Image
                      src={review.customer.avatar}
                      alt={review.customer.name || "Customer"}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-neutral-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-neutral-900 text-sm sm:text-base flex items-center gap-2">
                    <span>{review.customer?.name || "Verified Customer"}</span>
                  </div>
                  <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {review.createdAt ? formatDateTime(review.createdAt) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <ReviewStatusBadge isApproved={Boolean(review.isApproved)} size="md" />
              </div>
            </div>

            {/* Product & Variant Card */}
            <div className="p-4 rounded-xl border border-cream-border bg-white shadow-2xs space-y-2.5">
              <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Reviewed Item</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                    <span>{review.product?.name || "Product"}</span>
                    {review.product?.slug && (
                      <Link
                        href={`/products/${review.product.slug}`}
                        target="_blank"
                        className="text-xs text-secondary-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  {review.variant && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-cream-200 px-2 py-0.5 rounded-md border border-cream-border">
                        <Layers className="w-3 h-3 text-neutral-400" />
                        SKU: {review.variant.sku}
                      </span>
                      {review.variant.name && (
                        <span>{review.variant.name}</span>
                      )}
                    </div>
                  )}

                  {review.orderItem && (
                    <div className="text-xs text-neutral-400 flex items-center gap-1.5 pt-0.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>
                        Order Item: {review.orderItem.productNameSnapshot || "Purchased"} (Qty: {review.orderItem.quantity || 1})
                      </span>
                    </div>
                  )}
                </div>

                {review.product?.id && (
                  <Link
                    href={`/admin/dashboard/products/${encodeURIComponent(review.product.id)}`}
                    className="text-xs font-semibold text-secondary-600 hover:text-secondary-700 bg-secondary-50 hover:bg-secondary-100 border border-secondary-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 self-start sm:self-center"
                  >
                    <span>View in Admin</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Review Content (Rating, Title, Comment) */}
            <div className="p-4 rounded-xl border border-cream-border bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-cream-border pb-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                    Rating Score
                  </div>
                  <ReviewRatingStars rating={review.rating} size="lg" showScore />
                </div>

                <div className="text-right text-xs text-neutral-400">
                  {review.updatedAt && (
                    <div>Updated: {formatDateTime(review.updatedAt)}</div>
                  )}
                </div>
              </div>

              {review.title && (
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1">
                    Title
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900">
                    {review.title}
                  </h4>
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1 flex items-center gap-1">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  <span>Customer Review</span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap bg-cream-50 p-3 rounded-lg border border-cream-border-subtle">
                  {review.comment || "No text feedback provided with this rating."}
                </p>
              </div>

              {/* Review Photos / Images */}
              {Array.isArray(review.images) && review.images.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                    Attached Photos ({review.images.length})
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {review.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImage(imgUrl)}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-cream-border bg-cream-100 hover:border-secondary-600 transition-all cursor-pointer"
                      >
                        <Image
                          src={imgUrl}
                          alt={`Review photo ${idx + 1}`}
                          fill
                          sizes="64px"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-cream-border">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                disabled={deleteMutation.isPending || updateStatusMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Delete Review</span>
              </Button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>

                {review.isApproved ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusToggle(false)}
                    disabled={updateStatusMutation.isPending}
                    className="w-full sm:w-auto border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    <span>Unapprove</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleStatusToggle(true)}
                    disabled={updateStatusMutation.isPending}
                    className="w-full sm:w-auto bg-success-600 hover:bg-success-700 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Approve Review</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Image Lightbox Overlay Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in-0 duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] w-full h-[70vh] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImage}
              alt="Expanded review photo"
              fill
              sizes="(max-width: 1024px) 100vw, 768px"
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Review Deletion */}
      <ConfirmDialog
        open={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Review?"
        description="This will permanently delete this review from the system and recalculate product rating aggregations. This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
