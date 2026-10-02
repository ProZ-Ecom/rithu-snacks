"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveSnackFallbackImage } from "@/lib/storefront";
import { formatMeasurementLabel } from "@/features/variants/utils/measurement.util";
import { useAddToCart } from "@/features/cart/hooks/use-cart";
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { SnackCard } from "@/components/storefront/cards/SnackCard";
import type { CustomerVariantListItemDto } from "../types";

interface ProductVariantSelectorProps {
  variants: CustomerVariantListItemDto[];
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
  productName?: string;
  categoryName?: string;
  className?: string;
}

export function ProductVariantSelector({
  variants,
  selectedVariantId: _selectedVariantId,
  onSelect: _onSelect,
  productName,
  categoryName,
  className,
}: ProductVariantSelectorProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const addToCart = useAddToCart();
  const { data: wishlist } = useWishlist({ enabled: !!session });
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const [addingVariantId, setAddingVariantId] = React.useState<string | null>(null);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScrollability = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  React.useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollability, { passive: true });
    window.addEventListener("resize", checkScrollability);
    return () => {
      el.removeEventListener("scroll", checkScrollability);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [checkScrollability, variants]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(280, el.clientWidth * 0.75);
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!variants || variants.length <= 1) return null;

  const handleAddToCart = (variant: CustomerVariantListItemDto, unitPriceId?: string) => {
    if (!session) {
      const returnUrl =
        typeof window !== "undefined" ? window.location.pathname : "/products";
      router.push(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    const defaultUnit =
      variant.unitPrices?.find((u) => u.isDefault) || variant.unitPrices?.[0];
    const targetUnitId = unitPriceId || defaultUnit?.id;
    if (!targetUnitId) return;

    setAddingVariantId(variant.id);
    addToCart.mutate(
      { variantUnitPriceId: targetUnitId, quantity: 1 },
      {
        onSuccess: () => {
          toast.success("Added to cart", variant.variantName);
          setAddingVariantId(null);
        },
        onError: () => {
          toast.error("Could not add item to cart");
          setAddingVariantId(null);
        },
      }
    );
  };

  const handleWishlistToggle = (variant: CustomerVariantListItemDto, unitPriceId?: string) => {
    if (!session) {
      const returnUrl =
        typeof window !== "undefined" ? window.location.pathname : "/products";
      router.push(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    const defaultUnit =
      variant.unitPrices?.find((u) => u.isDefault) || variant.unitPrices?.[0];
    const targetUnitId = unitPriceId || defaultUnit?.id;
    if (!targetUnitId) return;
    if (addToWishlist.isPending || removeFromWishlist.isPending) return;

    const isWishlisted = !!wishlist?.items.some((i) => i.variantUnitPriceId === targetUnitId);
    if (isWishlisted) {
      removeFromWishlist.mutate(targetUnitId);
    } else {
      addToWishlist.mutate(targetUnitId);
    }
  };

  return (
    <section className={cn("w-full relative", className)}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#8B1D1D] block mb-1 font-sans">
            COMPLETE YOUR FESTIVE BOX
          </span>
          <h2 className="font-serif text-xl sm:text-2xl lg:text-[34px] font-bold text-[#2B1B17] tracking-tight leading-tight">
            You May Also Like
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8B1D1D] hover:text-[#5A1911] transition-colors group"
          >
            <span>View All Sweets & Savories</span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Optional desktop arrows in header as backup / quick access */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-stone-200">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Previous items"
              className="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-stone-700 transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Next items"
              className="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-stone-700 transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slider Container with Amazon-style Left & Right Arrows */}
      <div className="relative group/slider">
        {/* Floating Left Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-14 sm:w-10 sm:h-16 rounded-md sm:rounded-lg bg-white/95 backdrop-blur-xs border border-stone-300/80 shadow-md flex items-center justify-center text-stone-700 hover:bg-white hover:border-stone-400 hover:text-stone-950 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </button>
        )}

        {/* Single-row Horizontal Scroll Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch flex-nowrap gap-4 sm:gap-5 overflow-x-auto scroll-smooth py-2 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {variants.map((variant) => {
            const cardVariants = (variant.unitPrices || []).map((up) => ({
              id: up.id,
              label: formatMeasurementLabel(up.measurement),
              price: up.sellingPrice,
              comparePrice: up.basePrice > up.sellingPrice ? up.basePrice : null,
              inStock: !variant.outOfStock,
              isDefault: Boolean(up.isDefault),
            }));


            const defaultUnit =
              variant.unitPrices?.find((u) => u.isDefault) || variant.unitPrices?.[0];

            const isWishlisted = !!wishlist?.items.some((i) =>
              variant.unitPrices?.some((u) => u.id === i.variantUnitPriceId)
            );

            const isAddingThis = addingVariantId === variant.id;

            const defaultPrice = defaultUnit?.sellingPrice ?? variant.salePrice ?? variant.basePrice ?? 0;
            const comparePrice = defaultUnit?.basePrice ?? variant.basePrice ?? null;
            const discountPercent =
              comparePrice && comparePrice > defaultPrice
                ? Math.round(((comparePrice - defaultPrice) / comparePrice) * 100)
                : null;

            return (
              <div
                key={variant.id}
                className="w-[230px] sm:w-[250px] md:w-[270px] shrink-0 flex flex-col"
              >
                <SnackCard
                  id={variant.id}
                  name={variant.variantName}
                  subtitle={categoryName || productName || "Authentic Snack"}
                  image={variant.primaryImage || resolveSnackFallbackImage(variant.variantName)}
                  href={`/products/${variant.productId || variant.id}?variant=${variant.id}`}
                  variants={cardVariants}
                  discountPercent={discountPercent}
                  isWishlisted={isWishlisted}
                  onWishlistToggle={(unitId?: string) => handleWishlistToggle(variant, unitId)}
                  onAddToCart={(unitId?: string) => handleAddToCart(variant, unitId)}
                  isLoading={isAddingThis}
                  disabled={variant.outOfStock}
                  className="w-full h-full shadow-2xs hover:shadow-md"
                />
              </div>
            );
          })}
        </div>

        {/* Floating Right Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-14 sm:w-10 sm:h-16 rounded-md sm:rounded-lg bg-white/95 backdrop-blur-xs border border-stone-300/80 shadow-md flex items-center justify-center text-stone-700 hover:bg-white hover:border-stone-400 hover:text-stone-950 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </button>
        )}
      </div>
    </section>
  );
}


export default ProductVariantSelector;
