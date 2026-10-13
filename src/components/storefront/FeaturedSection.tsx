"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronRight, Sparkles } from "lucide-react";
import { SnackCard } from "./cards/SnackCard";
import { ProductCardSkeleton } from "./cards/ProductCardSkeleton";
import { SectionHeading } from "./heading/SectionHeading";
import { PrimaryButton } from "./buttons/PrimaryButton";
import { Section } from "./Section";
import { useCustomerVariants } from "@/features/variants";
import { useAddToCart } from "@/features/cart/hooks/use-cart";
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlistedUnitPriceIds,
} from "@/features/wishlist/hooks/use-wishlist";
import { mapVariantToStorefrontProduct } from "@/lib/storefront";
import { ICONS, type StorefrontProduct } from "@/constants/storefront";

export interface FeaturedSectionProps {
  className?: string;
  limit?: number;
}

export function FeaturedSection({ className = "", limit = 8 }: FeaturedSectionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Fetch only items where isFeatured === true from the Customer Catalog API
  const { data: response, isLoading, isError } = useCustomerVariants({
    isFeatured: true,
    page: 1,
    pageSize: limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { wishlistedIds } = useWishlistedUnitPriceIds({ enabled: !!session });
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const products: StorefrontProduct[] = React.useMemo(() => {
    return (response?.data ?? []).map(mapVariantToStorefrontProduct);
  }, [response]);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const requireLogin = () => {
    router.push("/login?callbackUrl=/");
  };

  const handleAddToCart = (product: StorefrontProduct, unitPriceId: string) => {
    if (!session) return requireLogin();
    addToCart.mutate(
      { variantUnitPriceId: unitPriceId, quantity: 1 },
      {
        onSuccess: () => showNotification(`Added ${product.name} to cart`),
        onError: () => showNotification("Could not add item to cart"),
      }
    );
  };

  const handleWishlistToggle = (product: StorefrontProduct, unitPriceId: string) => {
    if (!session) return requireLogin();
    if (wishlistedIds.has(unitPriceId)) {
      removeFromWishlist.mutate(unitPriceId, {
        onSuccess: () => showNotification(`Removed ${product.name} from wishlist`),
      });
    } else {
      addToWishlist.mutate(unitPriceId, {
        onSuccess: () => showNotification(`Added ${product.name} to wishlist`),
      });
    }
  };

  // Gracefully don't render empty section when there are no featured items
  if (!isLoading && (isError || products.length === 0)) {
    return null;
  }

  return (
    <Section className={`relative bg-[var(--cream-50)]/60 border-y border-[var(--cream-border)] py-8 sm:py-12 ${className}`}>
      {/* Toast alert feedback */}
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 rounded-xl bg-[var(--brown-800)] text-white px-5 py-3 shadow-xl text-sm font-medium animate-in fade-in-0 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Section Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-100)] text-[var(--secondary-shade-800)] text-xs font-extrabold uppercase tracking-widest mb-3">
          <Sparkles className="w-3.5 h-3.5 fill-[var(--primary-600)] text-[var(--primary-600)]" />
          <span>Chef&apos;s Specials</span>
        </div>
        <SectionHeading title="Featured Delights" className="mb-2 sm:mb-3" />
        <p className="text-xs sm:text-sm text-[var(--neutral-600)] max-w-xl mx-auto px-4">
          Handpicked signature recipes, crafted with authentic heritage traditions and pure love.
        </p>
      </div>

      {/* Products Grid */}
      <div
        className="
          grid
          grid-cols-2
          gap-3
          sm:gap-6
          md:grid-cols-3
          lg:grid-cols-4
        "
      >
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={`featured-skeleton-${index}`} />
          ))}

        {!isLoading &&
          products.map((product) => (
            <SnackCard
              key={`featured-${product.id}`}
              product={product}
              isFeatured={true}
              isWishlisted={product.unitPrices.some((u) => wishlistedIds.has(u.id))}
              onWishlistToggle={(unitPriceId) =>
                handleWishlistToggle(product, unitPriceId || product.unitPrices[0]?.id)
              }
              onAddToCart={(unitPriceId) =>
                handleAddToCart(product, unitPriceId || product.unitPrices[0]?.id)
              }
              disabled={addToCart.isPending}
            />
          ))}
      </div>

      {/* Explore All Link CTA */}
      <div className="flex justify-center mt-8 sm:mt-12">
        <Link href="/products?featured=true">
          <PrimaryButton
            variant="brown"
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-full text-sm font-bold cursor-pointer hover:scale-105 duration-300 transition-all shadow-xs"
          >
            <span>Explore All Featured Delights</span>
            <ChevronRight className="w-4 h-4 text-[var(--primary-base)]" />
          </PrimaryButton>
        </Link>
      </div>
    </Section>
  );
}

export default FeaturedSection;
