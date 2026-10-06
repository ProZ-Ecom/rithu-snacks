"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ICONS } from "@/constants/storefront";
import IconButton from "../buttons/IconButton";
import PrimaryButton from "../buttons/PrimaryButton";
import type { StorefrontProduct } from "@/constants/storefront";

export interface ProductCardProps {
  product: StorefrontProduct;
  type?: "product" | "wishlist" | "cart";
  isWishlisted?: boolean;
  /** Called with the currently selected pack size's VariantUnitPrice UUID. */
  onWishlistClick?: (unitPriceId: string) => void;
  /** "product" mode: add the selected pack size to cart. */
  onAddToCart?: (unitPriceId: string) => void;
  /** "wishlist" mode: move this row to cart. "cart" mode: buy now. */
  onButtonClick?: (unitPriceId: string) => void;
  /** "cart" mode: remove this line from the cart. */
  onRemove?: () => void;
  /** "cart" mode: current quantity for this line. */
  quantity?: number;
  actions?: {
    decreaseQuantity?: () => void;
    increaseQuantity?: () => void;
  };
  disabled?: boolean;
}

export function ProductCard({
  product,
  type = "product",
  isWishlisted = false,
  onWishlistClick,
  onAddToCart,
  onButtonClick,
  onRemove,
  quantity = 1,
  actions,
  disabled = false,
}: ProductCardProps) {
  const isCart = type === "cart";
  const isProduct = type === "product";
  const isWishlist = type === "wishlist";

  const unitPrices = product.unitPrices ?? [];
  const defaultUnitPriceId =
    unitPrices.find((u) => u.isDefault)?.id ?? unitPrices[0]?.id ?? "";

  const [selectedUnitPriceId, setSelectedUnitPriceId] = React.useState(defaultUnitPriceId);
  // Reset the selected pack size during render (not in an effect) whenever
  // this instance is handed a different product, e.g. a parent reusing the
  // same list slot for a new item.
  const [trackedProductId, setTrackedProductId] = React.useState(product.id);
  if (product.id !== trackedProductId) {
    setTrackedProductId(product.id);
    setSelectedUnitPriceId(defaultUnitPriceId);
  }

  const selectedUnitPrice =
    unitPrices.find((u) => u.id === selectedUnitPriceId) ?? unitPrices[0] ?? null;

  const wishlistIcon = isWishlisted ? ICONS.wishlist_red : ICONS.wishlist;

  const sellingPrice = selectedUnitPrice ? selectedUnitPrice.sellingPrice * (isCart ? quantity : 1) : 0;
  const basePriceTotal = selectedUnitPrice ? selectedUnitPrice.basePrice * (isCart ? quantity : 1) : 0;
  const hasDiscount = selectedUnitPrice ? selectedUnitPrice.sellingPrice < selectedUnitPrice.basePrice : false;
  const discountPercent =
    hasDiscount && selectedUnitPrice && selectedUnitPrice.basePrice > 0
      ? Math.round(
          ((selectedUnitPrice.basePrice - selectedUnitPrice.sellingPrice) /
            selectedUnitPrice.basePrice) *
            100
        )
      : 0;

  return (
    <div
      className="
        group
        bg-white
        rounded-xl
        border
        border-gray-200
        p-2
        sm:p-4
        transition-all
        duration-300
        flex
        flex-col
        justify-between
        cursor-pointer
        hover:border-[var(--brown-700)]
        hover:shadow-xl
        hover:-translate-y-2
      "
    >
      {/* Product Image */}
      <div className="relative overflow-hidden rounded-lg">
        <Link href={`/products/${product.productId}`}>
          <Image
            src={product.image}
            alt={product.name}
            width={300}
            height={300}
            className="
              w-full
              h-[160px]
              sm:h-[200px]
              md:h-[260px]
              object-cover
              transition-transform
              duration-300
              group-hover:scale-105
            "
          />
        </Link>

        {/* Discount */}
        {discountPercent > 0 && (
          <div
            className="
              absolute
              top-2
              left-2
              bg-red-600
              text-white
              text-[10px]
              font-semibold
              px-2
              py-1
              rounded-sm
            "
          >
            {discountPercent}% OFF
          </div>
        )}

        {/* Wishlist */}
        {!isCart && onWishlistClick && (
          <IconButton
            icon={wishlistIcon}
            alt="wishlist"
            onClick={() => selectedUnitPrice && onWishlistClick(selectedUnitPrice.id)}
            width={18}
            height={18}
            className="
              absolute
              top-2
              right-2
              h-8
              w-8
              rounded-full
              bg-white/60
              backdrop-blur-xs
              flex
              items-center
              justify-center
              hover:bg-white
            "
            imageClassName="w-[18px] h-[18px]"
          />
        )}

        {/* Remove (cart rows only) */}
        {isCart && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Remove from cart"
            className="
              absolute
              top-2
              right-2
              h-8
              w-8
              rounded-full
              bg-white/70
              backdrop-blur-xs
              flex
              items-center
              justify-center
              text-[var(--brown-800)]
              hover:bg-white
              hover:text-red-600
              transition-colors
            "
          >
            <Trash2 className="w-[16px] h-[16px]" />
          </button>
        )}
      </div>

      {/* Name + Weight */}
      <div className="flex mt-3 gap-2 justify-between items-start">
        <Link href={`/products/${product.productId}`} className="flex-1 pr-2 min-w-0">
          <h3
            className="
              uppercase
              text-[11px]
              sm:text-[13px]
              md:text-[15px]
              font-semibold
              leading-4
              sm:leading-5
              transition-colors
              duration-300
              text-hover-primary
              text-[var(--brown-900)]
            "
          >
            {product.name}
          </h3>
        </Link>

        <div className="flex flex-col items-end shrink-0">
          {isProduct && selectedUnitPrice && (
            <div className="flex justify-end">
              <span
                className="
                  px-1
                  sm:px-2
                  py-[2px]
                  text-[9px]
                  sm:text-[10px]
                  font-medium
                  border
                  rounded-xs
                  bg-[var(--brown-700)] text-white border-[var(--brown-700)]
                  select-none
                "
              >
                {selectedUnitPrice.label}
              </span>
            </div>
          )}


          {(isWishlist || isCart) && selectedUnitPrice && (
            <p className="mt-2 text-xs sm:text-sm text-gray-600">
              weight: <span className="font-medium ml-1">{selectedUnitPrice.label}</span>
            </p>
          )}

          <div className="flex gap-2 mt-2 items-center">
            {selectedUnitPrice ? (
              <>
                <p className="font-semibold text-[11px] sm:text-[13px] text-[var(--brown-900)]">
                  ₹{sellingPrice.toFixed(2)}
                </p>

                {hasDiscount && (
                  <p className="text-gray-400 line-through text-[11px] sm:text-[12px]">
                    ₹{basePriceTotal.toFixed(2)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-gray-400 italic">Coming soon</p>
            )}
          </div>
        </div>
      </div>

      {isCart && actions && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={actions.decreaseQuantity}
            disabled={disabled}
            className="h-7 w-7 rounded-md border text-xl cursor-pointer hover:bg-gray-100 transition flex items-center justify-center"
          >
            -
          </button>
          <span className="font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={actions.increaseQuantity}
            disabled={disabled}
            className="h-7 w-7 rounded-md border text-xl cursor-pointer hover:bg-gray-100 transition flex items-center justify-center"
          >
            +
          </button>
        </div>
      )}

      {/* Button */}
      <div className="w-full flex justify-end mt-4">
        <PrimaryButton
          onClick={() => {
            if (disabled || product.outOfStock || !selectedUnitPrice) return;
            if (isProduct) onAddToCart?.(selectedUnitPrice.id);
            else onButtonClick?.(selectedUnitPrice.id);
          }}
          variant="yellow"
          disabled={disabled || product.outOfStock || !selectedUnitPrice}
          className="w-[80%] sm:w-[70%] block uppercase"
        >
          {disabled
            ? "..."
            : !selectedUnitPrice
              ? "Coming Soon"
              : product.outOfStock
                ? "Out of Stock"
                : isCart
                  ? "Buy Now"
                  : isWishlist
                    ? "Move to Cart"
                    : "Add To Cart"}
        </PrimaryButton>
      </div>
    </div>
  );
}

export default ProductCard;
