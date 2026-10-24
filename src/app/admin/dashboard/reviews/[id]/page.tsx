"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  Package,
  Layers,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Trash2,
  Maximize2,
  X,
  MessageSquareQuote,
  Clock,
} from "lucide-react";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminContent } from "@/components/admin/AdminPageHeader";
import { AdminDetailSkeleton } from "@/components/admin/AdminDetailSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/utils";
import { ReviewRatingStars } from "@/features/reviews/components/ReviewRatingStars";
import { ReviewStatusBadge } from "@/features/reviews/components/ReviewStatusBadge";
import {
  useAdminReview,
  useUpdateReviewStatus,
  useDeleteAdminReview,
} from "@/features/reviews/hooks/use-admin-reviews";

interface ReviewDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const router = useRouter();
  const { id: reviewId } = use(params);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const { data: review, isLoading, error, refetch } = useAdminReview(reviewId);
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
    router.push("/admin/dashboard/reviews");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AdminBreadcrumb
          items={[
            { label: "Catalog", href: "/admin/dashboard/products" },
            { label: "Reviews", href: "/admin/dashboard/reviews" },
            { label: "Loading..." },
          ]}
        />
        <AdminDetailSkeleton />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="space-y-4">
        <AdminBreadcrumb
          items={[
            { label: "Catalog", href: "/admin/dashboard/products" },
            { label: "Reviews", href: "/admin/dashboard/reviews" },
            { label: "Not Found" },
          ]}
        />
        <div className="p-8">
          <ErrorState
            title="Review Not Found"
            message={(error as Error)?.message || "The requested review could not be found."}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminBreadcrumb
        items={[
          { label: "Catalog", href: "/admin/dashboard/products" },
          { label: "Reviews", href: "/admin/dashboard/reviews" },
          { label: review.title || `Review #${review.id.slice(0, 8)}` },
        ]}
      />

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-cream-border p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/dashboard/reviews"
              className="w-8 h-8 rounded-lg border border-cream-border hover:bg-cream-100 flex items-center justify-center text-neutral-600 transition-colors"
              title="Back to reviews"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              {review.title || "Customer Review"}
            </h1>
            <ReviewStatusBadge isApproved={Boolean(review.isApproved)} size="md" />
          </div>
          <p className="text-xs text-neutral-400 pl-11">
            Created on {review.createdAt ? formatDateTime(review.createdAt) : "—"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsConfirmDeleteOpen(true)}
            disabled={deleteMutation.isPending || updateStatusMutation.isPending}
            className="h-9"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Delete Review</span>
          </Button>

          {review.isApproved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusToggle(false)}
              disabled={updateStatusMutation.isPending}
              className="h-9 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
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
              className="h-9 bg-success-600 hover:bg-success-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Approve Review</span>
            </Button>
          )}
        </div>
      </div>

      <AdminContent>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Review Feedback, Rating, and Images (8 Cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Feedback Content Card */}
            <div className="bg-white rounded-2xl border border-cream-border p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-cream-border pb-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                    Customer Rating
                  </div>
                  <ReviewRatingStars rating={review.rating} size="lg" showScore />
                </div>

                {review.updatedAt && (
                  <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last updated: {formatDateTime(review.updatedAt)}</span>
                  </div>
                )}
              </div>

              {review.title && (
                <div>
                  <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1">
                    Review Headline
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">
                    {review.title}
                  </h3>
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5" />
                  <span>Full Feedback</span>
                </div>
                <div className="p-4 rounded-xl bg-cream-50 border border-cream-border-subtle text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                  {review.comment || "No detailed review message was left by the customer."}
                </div>
              </div>

              {/* Photos Gallery */}
              {Array.isArray(review.images) && review.images.length > 0 && (
                <div className="pt-3 space-y-2.5">
                  <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
                    Attached Customer Photos ({review.images.length})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {review.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImage(imgUrl)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-cream-border bg-cream-100 hover:border-secondary-600 transition-all cursor-pointer shadow-2xs"
                      >
                        <Image
                          src={imgUrl}
                          alt={`Review photo ${idx + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 160px"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Maximize2 className="w-5 h-5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Customer & Product Info (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Customer Info Card */}
            <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-xs space-y-3.5">
              <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Customer Details</span>
              </div>

              <div className="flex items-center gap-3 pt-1">
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
                <div className="min-w-0">
                  <div className="font-bold text-sm text-neutral-900 truncate">
                    {review.customer?.name || "Verified Customer"}
                  </div>
                  {review.customer?.id && (
                    <div className="font-mono text-[11px] text-neutral-400 truncate">
                      ID: {review.customer.id.slice(0, 10)}...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product & Variant Details Card */}
            <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-xs space-y-3.5">
              <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Product Information</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="text-xs text-neutral-400 font-medium">Product</div>
                  <div className="text-sm font-bold text-neutral-900">
                    {review.product?.name || "Product"}
                  </div>
                </div>

                {review.variant && (
                  <div className="p-2.5 rounded-lg bg-cream-100 border border-cream-border space-y-1">
                    <div className="text-xs font-semibold text-neutral-800">
                      {review.variant.name || "Variant"}
                    </div>
                    <div className="font-mono text-xs text-neutral-500 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-neutral-400" />
                      <span>SKU: {review.variant.sku}</span>
                    </div>
                  </div>
                )}

                {review.orderItem && (
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5 pt-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      Qty: {review.orderItem.quantity || 1} • {review.orderItem.productNameSnapshot}
                    </span>
                  </div>
                )}

                {review.product?.id && (
                  <div className="pt-2">
                    <Link
                      href={`/admin/dashboard/products/${encodeURIComponent(review.product.id)}`}
                      className="w-full text-xs font-semibold text-secondary-600 hover:text-secondary-700 bg-secondary-50 hover:bg-secondary-100 border border-secondary-200 py-2 px-3 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <span>Open Product in Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminContent>

      {/* Lightbox Preview Modal */}
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

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        open={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Review?"
        description="This will permanently delete this review from the system. This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
