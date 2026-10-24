"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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

export interface ProductSectionProps {
  selectedCategoryId?: string | null;
}

export function ProductSection({ selectedCategoryId }: ProductSectionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showAll, setShowAll] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Fetch variants from the real Customer Catalog API
  const { data: response, isLoading, isError } = useCustomerVariants({
    categoryIds: selectedCategoryId ? [selectedCategoryId] : undefined,
    page: 1,
    pageSize: 20,
    skipFacets: true,
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

  const visibleProducts = showAll ? products : products.slice(0, 4);

  return (
    <Section className="relative">
      {/* Toast alert feedback */}
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 rounded-xl bg-[var(--brown-800)] text-white px-5 py-3 shadow-xl text-sm font-medium animate-in fade-in-0 duration-200">
          {toastMessage}
        </div>
      )}

      <SectionHeading title="Better snacking starts here!" />

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
            <ProductCardSkeleton key={`skeleton-${index}`} />
          ))}

        {!isLoading &&
          visibleProducts.map((product) => (
            <SnackCard
              key={product.id}
              product={product}
              isFeatured={product.isFeatured}
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

      {/* Empty State */}
      {!isLoading && !isError && products.length === 0 && (
        <div className="py-16 text-center text-sm text-[var(--color-neutral-500)]">
          <p className="text-base font-medium text-[var(--brown-800)]">
            No snacks found in this category.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Please explore our other delicious snack categories.
          </p>
        </div>
      )}

      {/* View All Button */}
      {products.length > 4 && (
        <div className="flex justify-center mt-12">
          <PrimaryButton
            variant="brown"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-full text-sm cursor-pointer hover:scale-105 duration-300 transition-all"
          >
            <Image
              src={ICONS.view_all}
              alt="view_all"
              width={16}
              height={16}
            />
            <span className="header-font">
              {showAll ? "Show Less" : "View All"}
            </span>
          </PrimaryButton>
        </div>
      )}
    </Section>
  );
}

export default ProductSection;
