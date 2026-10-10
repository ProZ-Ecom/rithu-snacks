"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import { useCustomerGlobalVariants } from "@/features/customers/hooks/use-customer-catalog";
import { CustomerVariantCard } from "@/features/customers/components/catalog/CustomerVariantCard";
import { ProductCardSkeleton } from "@/components/storefront/cards/ProductCardSkeleton";
import type { CustomerVariantListItemDto } from "@/features/customers/types/catalog.types";

export interface ProductFeaturedRecommendationsProps {
  currentProductId: string;
  className?: string;
}

export function ProductFeaturedRecommendations({
  currentProductId,
  className = "",
}: ProductFeaturedRecommendationsProps) {
  // Query featured variants from global catalog
  const { data: response, isLoading, isError } = useCustomerGlobalVariants({
    isFeatured: true,
    pageSize: 8,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const variants: CustomerVariantListItemDto[] = React.useMemo(() => {
    return (response?.data ?? []).filter((v) => v.productId !== currentProductId);
  }, [response, currentProductId]);

  if (!isLoading && (isError || variants.length === 0)) {
    return null;
  }

  return (
    <div className={`w-full pt-12 mt-12 border-t border-[#F0EAE1] ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8 pb-3 border-b border-[#F0EAE1]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-100)] text-[var(--secondary-shade-800)] text-xs font-extrabold uppercase tracking-widest mb-2">
            <Sparkles className="w-3.5 h-3.5 fill-[var(--primary-600)] text-[var(--primary-600)]" />
            <span>Curated Specials</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--brown-800)] tracking-tight">
            You Might Also Love
          </h3>
          <p className="text-xs sm:text-sm text-[var(--neutral-600)] mt-0.5">
            Handcrafted traditional recipes and customer favorites.
          </p>
        </div>

        <Link
          href="/products?featured=true"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] hover:underline shrink-0"
        >
          <span>View all specials</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, idx) => (
            <ProductCardSkeleton key={`rec-skeleton-${idx}`} />
          ))}

        {!isLoading &&
          variants.slice(0, 4).map((variant) => (
            <CustomerVariantCard key={`rec-${variant.id}`} variant={variant} />
          ))}
      </div>
    </div>
  );
}

export default ProductFeaturedRecommendations;
