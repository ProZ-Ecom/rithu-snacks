"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Check,
  Sparkles,
  Loader2,
  Star,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "./ProductGallery";
import { ProductVariantSelector } from "./ProductVariantSelector";
import { getImageUrl } from "@/lib/utils";
import { formatMeasurementLabel } from "@/features/variants/utils/measurement.util";
import { useAddToCart } from "@/features/cart/hooks/use-cart";
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { usePublicVariantReviews } from "@/features/reviews/hooks/use-public-reviews";
import { ProductReviewsSection } from "@/features/reviews/components/ProductReviewsSection";
import { ProductFeaturedRecommendations } from "./ProductFeaturedRecommendations";
import type { CustomerProductDetailDto, CustomerVariantListItemDto } from "../types";
import { sanitizeRichText } from "@/lib/sanitize-html";

interface ProductDetailsProps {
  product: CustomerProductDetailDto;
}

function ProductDetails({ product }: ProductDetailsProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const variants = product.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    () => variants[0]?.id ?? null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get("variant");
      if (v && variants.some((varItem) => varItem.id === v)) {
        setSelectedVariantId((prev) => (prev === v ? prev : v));
      }
    }
  }, [variants]);

  const selectedVariant: CustomerVariantListItemDto | null =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null;

  const unitPrices = selectedVariant?.unitPrices ?? [];
  const [selectedUnitPriceId, setSelectedUnitPriceId] = useState<string | null>(
    unitPrices.find((u) => u.isDefault)?.id ?? unitPrices[0]?.id ?? null
  );
  const selectedUnitPrice =
    unitPrices.find((u) => u.id === selectedUnitPriceId) ?? unitPrices[0] ?? null;

  const [quantity, setQuantity] = useState(1);

  // Accordion state (Authentic Ingredients open by default like Figma)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    ingredients: true,
    storage: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addToCart = useAddToCart();
  const { data: wishlist } = useWishlist({ enabled: !!session });
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const { data: variantReviewsData } = usePublicVariantReviews(selectedVariant?.id);
  const avgRating = variantReviewsData?.ratingSummary?.averageRating ?? 0;
  const totalReviews =
    variantReviewsData?.ratingSummary?.totalReviews ??
    variantReviewsData?.reviews?.length ??
    0;

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    const next = variants.find((v) => v.id === variantId);
    const nextUnitPrices = next?.unitPrices ?? [];
    setSelectedUnitPriceId(
      nextUnitPrices.find((u) => u.isDefault)?.id ?? nextUnitPrices[0]?.id ?? null
    );
    setQuantity(1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const isInStock = !selectedVariant?.outOfStock;
  const sellingPrice = selectedUnitPrice?.sellingPrice ?? 0;
  const basePrice = selectedUnitPrice?.basePrice ?? 0;
  const hasDiscount = sellingPrice < basePrice;
  const discountPercent =
    hasDiscount && basePrice > 0
      ? Math.round(((basePrice - sellingPrice) / basePrice) * 100)
      : 0;

  const isInWishlist =
    !!selectedUnitPrice &&
    !!wishlist?.items.some((i) => i.variantUnitPriceId === selectedUnitPrice.id);

  const galleryImages = useMemo(() => {
    const list: Array<{ id: string; url: string; altText?: string | null }> = [];
    const seen = new Set<string>();

    const isValidUrl = (url?: string | null): boolean => {
      if (!url) return false;
      const trimmed = url.trim();
      return (
        trimmed !== "" &&
        trimmed !== "null" &&
        trimmed !== "undefined" &&
        trimmed !== "/images/placeholder.png" &&
        !(trimmed.startsWith("/logos/") && trimmed.endsWith(".png"))
      );
    };

    const addImage = (id: string, url?: string | null, altText?: string | null) => {
      if (!isValidUrl(url)) return;
      const formatted = getImageUrl(url!);
      if (formatted && isValidUrl(formatted) && !seen.has(formatted)) {
        seen.add(formatted);
        list.push({ id, url: formatted, altText });
      }
    };

    // 1. If active variant has explicit multiple images, use them
    const validVariantImages = (selectedVariant?.images || []).filter((img) => isValidUrl(img.imageUrl));
    if (validVariantImages.length > 0) {
      for (const img of validVariantImages) {
        addImage(img.id, img.imageUrl, selectedVariant?.variantName || product.name);
      }
      return list.slice(0, 4);
    }

    // 2. Otherwise, if parent product has multiple images, use them
    const validProductImages = (product.images || []).filter((img) => isValidUrl(img.imageUrl));
    if (validProductImages.length > 0) {
      for (const img of validProductImages) {
        addImage(img.id, img.imageUrl, img.altText || product.name);
      }
      return list.slice(0, 4);
    }

    // 3. Fallback to single primary image
    if (isValidUrl(selectedVariant?.primaryImage)) {
      addImage(selectedVariant!.id, selectedVariant!.primaryImage, selectedVariant?.variantName || product.name);
    } else if (isValidUrl(product.image)) {
      addImage(product.id, product.image, product.name);
    }

    return list.slice(0, 4);
  }, [selectedVariant, product]);

  const handleAddToCart = () => {
    if (!session) {
      router.push(`/login?callbackUrl=/products/${product.id}`);
      return;
    }
    if (!selectedUnitPrice) return;
    addToCart.mutate({
      variantUnitPriceId: selectedUnitPrice.id,
      variantId: selectedVariant?.id,
      quantity,
    });
  };

  const handleWishlistToggle = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!session) {
      router.push(`/login?callbackUrl=/products/${product.id}`);
      return;
    }
    if (!selectedUnitPrice) return;
    if (addToWishlist.isPending || removeFromWishlist.isPending) return;

    if (isInWishlist) {
      removeFromWishlist.mutate(selectedUnitPrice.id);
    } else {
      addToWishlist.mutate(selectedUnitPrice.id);
    }
  };

  const rawIngredients = selectedVariant?.ingredients?.trim();
  const hasIngredients = Boolean(rawIngredients);
  const parsedIngredients = hasIngredients
    ? rawIngredients!
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const shelfLife = selectedVariant?.shelfLife?.trim();
  const hasShelfLife = Boolean(shelfLife);

  return (
    <div className="w-full space-y-12">
      {/* 2-Column Product Gallery + Details Buy Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Gallery (sticky only on lg screens within this block) */}
        <div className="lg:col-span-6 lg:sticky lg:top-24">
          <ProductGallery
            images={galleryImages}
            productName={selectedVariant?.variantName || product.name}
            isInStock={isInStock}
          />
        </div>

        {/* Right Details */}
        <div className="lg:col-span-6 space-y-6">
          {/* Category, Brand & SKU Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {product.category && (
              <Link
                href={`/categories/${product.category.id}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#8B1D1D]/10 text-[#8B1D1D] hover:bg-[#8B1D1D]/20 transition-colors"
              >
                {product.category.name}
              </Link>
            )}
            {product.brand && (
              <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                Brand: <strong className="text-stone-700">{product.brand.name}</strong>
              </span>
            )}
            {selectedUnitPrice?.sku && (
              <span className="text-xs font-mono text-stone-400 bg-stone-50 border border-stone-200/80 px-2.5 py-1 rounded-full">
                SKU: {selectedUnitPrice.sku}
              </span>
            )}
          </div>

          {/* Titles & Review Social Proof */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
              {product.name}
            </h1>
            {selectedVariant && (
              <p className="text-base sm:text-lg text-stone-600 font-medium mt-1">
                {selectedVariant.variantName}
              </p>
            )}

            {/* Star Rating Social Proof (Only show real rating if reviews exist) */}
            {totalReviews > 0 ? (
              <a
                href="#reviews-section"
                className="inline-flex items-center gap-2 mt-2 text-xs font-semibold text-stone-600 hover:text-[#8B1D1D] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(avgRating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-stone-200 text-stone-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-stone-900">{avgRating.toFixed(1)}</span>
                <span className="text-stone-300">•</span>
                <span className="underline underline-offset-2 text-stone-500 group-hover:text-[#8B1D1D]">
                  {totalReviews} customer {totalReviews === 1 ? "review" : "reviews"}
                </span>
              </a>
            ) : (
              <a
                href="#reviews-section"
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-stone-500 hover:text-[#8B1D1D] transition-colors cursor-pointer"
              >
                <span>No reviews yet</span>
                <span className="text-stone-300">•</span>
                <span className="underline underline-offset-2">Be the first to review</span>
              </a>
            )}
          </div>

          {/* Pricing Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/50 via-stone-50 to-white border border-amber-200/40">
            {selectedUnitPrice ? (
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#8B1D1D] tracking-tight">
                  ₹{sellingPrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-lg sm:text-xl line-through text-stone-400">
                    ₹{basePrice.toFixed(2)}
                  </span>
                )}
                {hasDiscount && discountPercent > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Sparkles className="w-3 h-3" />
                    Save {discountPercent}%
                  </span>
                )}
                <span className="text-xs text-stone-400 block w-full mt-1">
                  Inclusive of all taxes • Freshly packed
                </span>
              </div>
            ) : (
              <p className="text-sm text-stone-500 italic">
                Pricing for this item is coming soon.
              </p>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div
              className="rich-text-content text-sm text-stone-600 leading-relaxed max-w-none border-b border-stone-100 pb-4"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(product.description) }}
            />
          )}

          {/* Pack Size Selection (Figma Style) */}
          {unitPrices.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold tracking-wider text-stone-900 uppercase font-sans">
                  CHOOSE PACK SIZE
                </span>
                {selectedUnitPrice && (
                  <span className="text-xs sm:text-sm text-[#8B1D1D] font-semibold">
                    Selected: {formatMeasurementLabel(selectedUnitPrice.measurement)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {unitPrices.map((unitPrice) => {
                  const isSelected = selectedUnitPriceId === unitPrice.id;
                  const measurementLabel = formatMeasurementLabel(unitPrice.measurement);
                  const price = unitPrice.sellingPrice;
                  const compare = unitPrice.basePrice;
                  const discount =
                    compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

                  return (
                    <button
                      key={unitPrice.id}
                      type="button"
                      onClick={() => setSelectedUnitPriceId(unitPrice.id)}
                      className={`relative flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-[#7D1D20] bg-[#7D1D20] text-white shadow-sm"
                          : "border-stone-200 bg-white text-stone-800 hover:border-stone-400 hover:bg-stone-50"
                      }`}
                    >
                      {discount > 0 && (
                        <span className="absolute -top-2.5 right-2 bg-[#D99A46] text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-2xs">
                          SAVE {discount}%
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-bold">
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{measurementLabel}</span>
                      </div>
                      <span
                        className={`text-xs sm:text-sm mt-0.5 ${
                          isSelected ? "text-stone-200 font-normal" : "text-stone-500 font-medium"
                        }`}
                      >
                        ₹{price.toFixed(0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Controls: Quantity + Add to Cart + Wishlist */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-3">
              {/* Quantity Selector */}
              <div className="flex items-center border border-stone-200 rounded-xl bg-white shadow-2xs overflow-hidden h-12">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || addToCart.isPending}
                  className="w-11 h-full flex items-center justify-center text-lg font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition-colors"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-11 text-center text-sm font-semibold text-stone-900 select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={addToCart.isPending}
                  className="w-11 h-full flex items-center justify-center text-lg font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Add to Cart CTA */}
              <Button
                type="button"
                size="lg"
                disabled={!isInStock || !selectedUnitPrice || addToCart.isPending}
                onClick={handleAddToCart}
                className="flex-1 h-12 bg-[#7D1D20] hover:bg-[#681719] text-white rounded-xl shadow-xs font-semibold text-base transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {addToCart.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Adding to Cart...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    {!selectedUnitPrice
                      ? "Unavailable"
                      : !isInStock
                        ? "Out of Stock"
                        : "Add to Cart"}
                  </>
                )}
              </Button>

              {/* Wishlist Button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={(e) => handleWishlistToggle(e)}
                disabled={addToWishlist.isPending || removeFromWishlist.isPending}
                className={`h-12 w-12 rounded-xl border-stone-200 hover:border-stone-400 bg-white transition-all active:scale-95 shrink-0 ${
                  isInWishlist ? "border-rose-300 bg-rose-50/50" : ""
                }`}
                aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                {addToWishlist.isPending || removeFromWishlist.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                ) : (
                  <Heart
                    className={`h-5 w-5 transition-transform ${
                      isInWishlist
                        ? "fill-rose-500 text-rose-500 scale-110"
                        : "text-stone-600 hover:text-rose-500"
                    }`}
                  />
                )}
              </Button>
            </div>

            {/* Stock availability indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  !selectedUnitPrice
                    ? "bg-stone-300"
                    : isInStock
                      ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                      : "bg-rose-500 ring-4 ring-rose-500/20"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  !selectedUnitPrice
                    ? "text-stone-500"
                    : isInStock
                      ? "text-emerald-700"
                      : "text-rose-600"
                }`}
              >
                {!selectedUnitPrice
                  ? "Unavailable"
                  : isInStock
                    ? "In Stock • Ready to ship (Dispatches in 24 hours via Express)"
                    : "Currently Out of Stock"}
              </span>
            </div>
          </div>

          {/* Collapsible Accordions (Render ONLY if backend ingredients or shelfLife available) */}
          {(hasIngredients || hasShelfLife) && (
            <div className="space-y-3 pt-2">
              {/* Accordion 1: Authentic Ingredients (Only if backend ingredients available) */}
              {hasIngredients && (
                <div className="rounded-2xl border border-[#F0EAE1] bg-[#FAF7F2]/40 overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleSection("ingredients")}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-[#FAF7F2]/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5 text-[#7D1D20]">
                      <Sparkles className="w-4 h-4 stroke-[2.2]" />
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2B1B17]">
                        AUTHENTIC INGREDIENTS
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                        openSections.ingredients ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {openSections.ingredients && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-[#F0EAE1]/70">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-[13px] text-stone-600 pt-2">
                        {parsedIngredients.map((ingredient, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-stone-400 font-bold">•</span>
                            <span>{ingredient}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Accordion 2: Best Before & Storage Guide (Only if backend shelfLife available) */}
              {hasShelfLife && (
                <div className="rounded-2xl border border-[#F0EAE1] bg-[#FAF7F2]/40 overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => toggleSection("storage")}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-[#FAF7F2]/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5 text-[#7D1D20]">
                      <Clock className="w-4 h-4 stroke-[2.2]" />
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#2B1B17]">
                        BEST BEFORE & STORAGE GUIDE
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                        openSections.storage ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {openSections.storage && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-[#F0EAE1]/70 text-xs sm:text-[13px] text-stone-600 space-y-2.5">
                      <div className="pt-2">
                        <span className="font-bold text-stone-800">Best Before: </span>
                        <span>{shelfLife}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-stone-800 block">Storage Guidelines:</span>
                        <ul className="space-y-1 pl-1">
                          <li className="flex items-start gap-2">
                            <span className="text-stone-400 font-bold">•</span>
                            <span>Store in a cool, dry place away from direct sunlight and ambient humidity.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-stone-400 font-bold">•</span>
                            <span>Transfer into an airtight container immediately after opening to preserve crunch and aroma.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-stone-400 font-bold">•</span>
                            <span>Do not refrigerate. Use a clean, dry spoon for serving.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* End 2-Column Product Gallery + Details Buy Box */}

      {/* Full-Width Guarantees Row Below Gallery & Details (Moved Below Like Figma) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">
        <div className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#F0EAE1] shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#8B1D1D]/10 flex items-center justify-center text-[#8B1D1D] shrink-0">
            <Truck className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#2B1B17] uppercase tracking-wide">FREE SHIPPING</h4>
            <p className="text-xs text-stone-500 mt-0.5">On all orders above ₹999</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#F0EAE1] shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#8B1D1D]/10 flex items-center justify-center text-[#8B1D1D] shrink-0">
            <Clock className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#2B1B17] uppercase tracking-wide">FAST DELIVERY</h4>
            <p className="text-xs text-stone-500 mt-0.5">Delivered in 3–5 days pan-India</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#F0EAE1] shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#8B1D1D]/10 flex items-center justify-center text-[#8B1D1D] shrink-0">
            <ShieldCheck className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#2B1B17] uppercase tracking-wide">100% AUTHENTIC</h4>
            <p className="text-xs text-stone-500 mt-0.5">Traditional South Indian recipes</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#F0EAE1] shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#8B1D1D]/10 flex items-center justify-center text-[#8B1D1D] shrink-0">
            <RotateCcw className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#2B1B17] uppercase tracking-wide">FRESHNESS GUARANTEE</h4>
            <p className="text-xs text-stone-500 mt-0.5">Hassle-free replacement guarantee</p>
          </div>
        </div>
      </div>

      {/* Complete Your Festive Box - You May Also Like (Fully outside sticky container) */}
      {variants.length > 1 && (
        <div className="w-full pt-10 border-t border-[#F0EAE1]">
          <ProductVariantSelector
            variants={variants}
            selectedVariantId={selectedVariantId}
            onSelect={handleSelectVariant}
            productName={product.name}
            categoryName={product.category?.name}
          />
        </div>
      )}

      {/* Connoisseur Feedback & Customer Reviews for Selected Variant */}
      <ProductReviewsSection
        variantId={selectedVariant?.id}
        variantName={selectedVariant?.variantName}
        productName={product.name}
        productIdOrSlug={product.id}
        selectedUnitPriceId={selectedUnitPrice?.id}
        packSizes={unitPrices}
      />

      {/* Featured Recommendations / You Might Also Love */}
      <ProductFeaturedRecommendations currentProductId={product.id} />
    </div>
  );
}

export { ProductDetails };
