"use client";

import * as React from "react";
import Image from "next/image";
import { Heart, Package } from "lucide-react";
import type { CustomerWishlistItemDto } from "@/features/wishlist/types/wishlist.types";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

interface CustomerWishlistSectionProps {
  wishlist?: any[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

function formatMeasurement(m: any): string | null {
  if (!m) return null;
  if (typeof m === "string") return m;
  if (typeof m === "object" && "value" in m && "unit" in m) {
    return `${m.value} ${m.unit}`.trim() || null;
  }
  return null;
}

export function CustomerWishlistSection({
  wishlist = [],
  isLoading = false,
  error = null,
  onRetry,
}: CustomerWishlistSectionProps) {
  if (isLoading) {
    return <LoadingState text="Loading customer wishlist..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error.message || "Failed to load customer wishlist"}
        onRetry={onRetry}
      />
    );
  }

  if (!wishlist || wishlist.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <Heart className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-neutral-900">
          No wishlist items found
        </h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          This customer has not added any items to their wishlist yet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {wishlist.map((item) => {
          const productName =
            item.product?.name || item.productName || "Product";
          const variantName = item.variantName || "";
          const sku = item.sku || "";
          const primaryImage = item.primaryImage || null;
          const isAvailable = item.isAvailable ?? item.inStock ?? true;

          const price =
            typeof item.price === "number"
              ? item.price
              : typeof item.salePrice === "number" && item.salePrice > 0
              ? item.salePrice
              : Number(item.basePrice) || 0;

          const basePrice =
            typeof item.basePrice === "number" ? item.basePrice : null;
          const hasDiscount =
            basePrice !== null && basePrice > price && price > 0;
          const discountPercent = hasDiscount
            ? Math.round(((basePrice - price) / basePrice) * 100)
            : item.discountPercent;

          const measurementStr = formatMeasurement(item.measurement);
          const addedDate = item.createdAt || item.addedAt;

          return (
            <div
              key={item.id}
              className="rounded-xl border border-cream-border bg-white p-3.5 sm:p-4 shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Image & Stock Badge */}
                <div className="relative h-36 sm:h-40 w-full rounded-lg overflow-hidden border border-cream-border bg-cream-50 flex items-center justify-center">
                  {primaryImage ? (
                    <Image
                      src={primaryImage}
                      alt={productName}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-neutral-400" />
                  )}

                  <div className="absolute top-2.5 right-2.5">
                    {isAvailable ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-success-50 text-success-700 shadow-xs">
                        In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-error-50 text-error-700 shadow-xs">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="truncate max-w-[140px]">
                      {item.categoryName || "Wishlist Item"}
                    </span>
                    {sku && (
                      <span className="font-mono text-[10px] text-neutral-400 truncate max-w-[110px]">
                        {sku}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 leading-snug">
                    {productName}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    {variantName && (
                      <span>
                        Variant:{" "}
                        <span className="font-medium text-neutral-700">
                          {variantName}
                        </span>
                      </span>
                    )}
                    {measurementStr && (
                      <>
                        {variantName && <span>•</span>}
                        <span className="font-medium text-neutral-600">
                          {measurementStr}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price Row */}
                <div className="flex items-baseline gap-2 pt-1 border-t border-cream-border-subtle">
                  <span className="text-base font-bold text-secondary-600 font-mono">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  {hasDiscount && basePrice && (
                    <span className="text-xs text-neutral-400 line-through font-mono">
                      ₹{basePrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  {Boolean(discountPercent && discountPercent > 0) && (
                    <span className="text-[10px] font-semibold text-success-700 bg-success-50 px-1.5 py-0.5 rounded">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
              </div>

              {addedDate && (
                <div className="pt-3 mt-3 border-t border-cream-border-subtle text-[11px] text-neutral-400">
                  Added:{" "}
                  {new Date(addedDate).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
