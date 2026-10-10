"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Sparkles } from "lucide-react";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { ProductImage } from "@/components/common/ProductImage";
import type { StorefrontProduct } from "@/constants/storefront";

export interface SnackCardVariant {
  id: string;
  label: string; // e.g. "50g", "100g"
  price: number; // Selling price e.g. 45
  comparePrice?: number | null; // Original price before discount e.g. 50
  inStock?: boolean;
  isDefault?: boolean;
}

export interface SnackCardProps {
  /** Optional ID or UUID of the product */
  id?: string;
  /** Title / Name of the snack (e.g. "THENKUZHAL MURUKKU") */
  name?: string;
  /** Subtitle (e.g. Product or Category name) */
  subtitle?: string;
  /** Image URL (relative or absolute) */
  image?: string | null;
  /** Optional link href (defaults to `/products/${id}`) */
  href?: string;
  /** Whether the item is a featured special */
  isFeatured?: boolean;
  /** Explicit discount percentage (e.g. 10 for "10% OFF") */
  discountPercent?: number | null;
  /** List of pack size variants (e.g. 50g, 100g) */
  variants?: SnackCardVariant[];
  /** Currently selected variant ID (uncontrolled if omitted) */
  selectedVariantId?: string;
  /** Callback when user clicks a variant pill */
  onVariantChange?: (variantId: string) => void;
  /** Whether the item is wishlisted */
  isWishlisted?: boolean;
  /** Callback when user clicks the heart icon */
  onWishlistToggle?: (variantId?: string) => void;
  /** Callback when user clicks "ADD TO CART" */
  onAddToCart?: (variantId?: string) => void;
  /** Loading state for add to cart */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional container classes */
  className?: string;
  /** Optionally pass a StorefrontProduct object directly */
  product?: StorefrontProduct;
  /** Fallback price if no variants are provided */
  fallbackPrice?: number;
  /** Optional preformatted price range text (e.g. "₹135.00 – ₹260.00") */
  priceRangeText?: string;
}

export function SnackCard({
  id,
  name,
  subtitle,
  image,
  href,
  isFeatured,
  discountPercent: explicitDiscount,
  variants = [],
  selectedVariantId: controlledSelectedVariantId,
  onVariantChange,
  isWishlisted = false,
  onWishlistToggle,
  onAddToCart,
  isLoading = false,
  disabled = false,
  className = "",
  product,
  fallbackPrice,
  priceRangeText,
}: SnackCardProps) {
  // If product prop is supplied, derive fields from it
  const resolvedId = id || product?.productId || product?.id || "";
  const resolvedName = name || product?.name || "Traditional Snack";
  const resolvedImage = image || product?.image || "";
  const resolvedHref = href || (resolvedId ? `/products/${resolvedId}` : "#");
  const resolvedIsFeatured = isFeatured !== undefined ? isFeatured : Boolean(product?.isFeatured);

  // Derive variants from StorefrontProduct if variants prop not explicitly given
  const resolvedVariants: SnackCardVariant[] = React.useMemo(() => {
    if (variants.length > 0) return variants;
    if (product?.unitPrices && product.unitPrices.length > 0) {
      return product.unitPrices.map((up) => ({
        id: up.id,
        label: up.label,
        price: up.sellingPrice,
        comparePrice: up.basePrice > up.sellingPrice ? up.basePrice : null,
        inStock: !product.outOfStock,
        isDefault: Boolean(up.isDefault),
      }));
    }
    return [];
  }, [variants, product]);

  // Default variant (marked as isDefault or first variant)
  const defaultVariant = React.useMemo(() => {
    return resolvedVariants.find((v) => v.isDefault) || resolvedVariants[0] || null;
  }, [resolvedVariants]);

  const defaultVariantId = defaultVariant?.id || "";
  const [internalSelectedId, setInternalSelectedId] = React.useState(defaultVariantId);

  React.useEffect(() => {
    if (defaultVariantId && !internalSelectedId) {
      setInternalSelectedId(defaultVariantId);
    }
  }, [defaultVariantId, internalSelectedId]);

  const activeVariantId =
    controlledSelectedVariantId !== undefined
      ? controlledSelectedVariantId
      : internalSelectedId || defaultVariantId;

  // Selected variant details (defaults to default variant)
  const activeVariant =
    resolvedVariants.find((v) => v.id === activeVariantId) || defaultVariant;

  const currentPrice = activeVariant ? activeVariant.price : (fallbackPrice ?? 0);
  const originalPrice = activeVariant?.comparePrice ?? null;

  // Calculate discount percentage
  const discount =
    explicitDiscount !== undefined && explicitDiscount !== null
      ? explicitDiscount
      : originalPrice && originalPrice > currentPrice
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : 0;

  return (
    <div
      className={`group bg-[var(--theme-surface)] pb-3 flex flex-col justify-between w-full max-w-sm transition-all duration-300 hover:shadow-md hover:border-[var(--brown-700)]/40 ${className}`}
    >
      {/* 1. Square Product Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--cream-100)]">
        <Link href={resolvedHref} className="block w-full h-full">
          <ProductImage
            src={resolvedImage}
            alt={resolvedName}
            fallbackText={resolvedName}
            containerClassName="w-full h-full aspect-square"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Badges Container (Top-Left: Featured & Discount) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1 pointer-events-none">
          {resolvedIsFeatured && (
            <div className="inline-flex items-center gap-1 bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)] text-[var(--secondary-shade-800)] font-black text-[10px] sm:text-[11px] px-2 py-0.5 uppercase tracking-wider rounded-[2px] shadow-xs">
              <Sparkles className="w-3 h-3 fill-[var(--secondary-shade-800)] text-[var(--secondary-shade-800)] shrink-0" />
              <span>Featured</span>
            </div>
          )}
          {discount > 0 && (
            <div className="bg-[var(--danger-base)] text-white font-extrabold text-[10px] sm:text-[11px] px-2 py-0.5 uppercase tracking-wider rounded-[2px] shadow-xs">
              {discount}% OFF
            </div>
          )}
        </div>

        {/* Wishlist Button (Top-Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onWishlistToggle?.(activeVariant?.id);
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2.5 right-2.5 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-xs shadow-xs flex items-center justify-center text-[var(--neutral-600)] hover:bg-white hover:text-[var(--danger-base)] hover:scale-105 transition-all cursor-pointer active:scale-90"
        >
          <Heart
            className={`w-5 h-5 transition-colors duration-200 ${
              isWishlisted
                ? "text-[var(--danger-base)] fill-[var(--danger-base)]"
                : "text-[var(--neutral-500)] stroke-[2]"
            }`}
          />
        </button>
      </div>

      {/* 2. Middle Info Row: Title on Left, Default Size + Price on Right */}
      <div className="mt-3.5 sm:mt-4 flex items-start justify-between gap-3 px-0.5">
        {/* Left Column: Product/Variant Title using global brown typography */}
        <div className="flex-1 pr-1 min-w-0">
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-stone-500 font-medium truncate mb-0.5">
              {subtitle}
            </p>
          )}
          <Link href={resolvedHref} className="block">
            <h3 className="font-extrabold text-[var(--brown-900)] uppercase text-sm sm:text-base md:text-[17px] tracking-tight leading-tight line-clamp-2 text-hover-primary transition-colors">
              {resolvedName}
            </h3>
          </Link>
        </div>

        {/* Right Column: Default Size Badge & Price */}
        <div className="flex flex-col items-end shrink-0">
          {/* Default Pack Size Label / Badge */}
          {activeVariant && (
            <div className="flex items-center justify-end">
              <span className="px-2 sm:px-2.5 py-0.5 text-xs font-bold rounded-[2px] bg-[var(--brown-700)] text-white border border-[var(--brown-700)] select-none">
                {typeof activeVariant.label === "string"
                  ? activeVariant.label
                  : typeof activeVariant.label === "object" && activeVariant.label !== null
                  ? `${(activeVariant.label as any).value ?? ""} ${(activeVariant.label as any).unit ?? ""}`.trim() || "Standard"
                  : String(activeVariant.label || "")}
              </span>
            </div>
          )}

          {/* Price & Strikethrough Row */}
          <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1.5 justify-end">
            {priceRangeText && resolvedVariants.length === 0 ? (
              <span className="font-bold text-[var(--brown-900)] text-sm sm:text-base tracking-tight">
                {priceRangeText}
              </span>
            ) : (
              <>
                <span className="font-bold text-[var(--brown-900)] text-sm sm:text-base tracking-tight">
                  {formatPrice(currentPrice)}
                </span>

                {originalPrice && originalPrice > currentPrice && (
                  <span className="text-xs sm:text-sm text-[var(--neutral-400)] line-through tracking-tight font-normal">
                    {formatPrice(originalPrice)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Bottom Action: Bright Golden "ADD TO CART" Button using global .btn-yellow */}
      <div className="w-full flex justify-end mt-3.5 sm:mt-4">
        <button
          type="button"
          disabled={disabled || isLoading || (activeVariant && activeVariant.inStock === false)}
          onClick={() => onAddToCart?.(activeVariant?.id)}
          className="w-[75%] sm:w-[70%] btn-yellow text-[var(--brown-900)] hover:scale-[1.02] active:scale-[0.98] font-extrabold text-xs sm:text-sm tracking-wider uppercase py-2.5 sm:py-3 px-4 rounded-[2px] shadow-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? "Adding..."
            : activeVariant?.inStock === false
              ? "Out of Stock"
              : "ADD TO CART"}
        </button>
      </div>
    </div>
  );
}

export default SnackCard;
