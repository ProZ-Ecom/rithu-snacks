import { SNACKSLOGOS, type StorefrontProduct } from "@/constants/storefront";
import { getImageUrl } from "@/lib/utils";
import { formatMeasurementLabel } from "@/features/variants/utils/measurement.util";
import type { CustomerVariantListItemDto } from "@/features/customers/types";
import type { CartItemResponse } from "@/features/cart/types";
import type { CustomerWishlistItemDto } from "@/features/wishlist/types";

/**
 * Best-effort decorative fallback image when a variant has no uploaded image
 * yet. Purely cosmetic - never affects pricing, cart, or wishlist behavior.
 */
export function resolveSnackFallbackImage(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("kai") && lower.includes("murukku")) return SNACKSLOGOS.kai_murukku;
  if (lower.includes("thenkuzhal")) return SNACKSLOGOS.thenkuzhal_murukku;
  if (lower.includes("chip") || lower.includes("crisp")) return SNACKSLOGOS.special_spicy_chips;
  if (
    lower.includes("mixture") ||
    lower.includes("namkeen") ||
    lower.includes("pakoda") ||
    lower.includes("omapodi") ||
    lower.includes("sev") ||
    lower.includes("ola")
  ) {
    return SNACKSLOGOS.mixture;
  }
  if (lower.includes("laddu")) return SNACKSLOGOS.laddu;
  if (lower.includes("jalebi")) return SNACKSLOGOS.jalebi;
  if (
    lower.includes("palkova") ||
    lower.includes("halwa") ||
    lower.includes("mysore") ||
    lower.includes("sweet")
  ) {
    return SNACKSLOGOS.palkova;
  }
  return SNACKSLOGOS.special_butter_murukku;
}

/**
 * Maps a real customer-catalog variant (one storefront "item", e.g. "Mango
 * Mysore Pak") into the shape the storefront ProductCard renders. Carries
 * every pack size for the item - not a fixed 50g/100g pair - each with its
 * own VariantUnitPrice UUID (what the cart/wishlist APIs key off).
 */
export function mapVariantToStorefrontProduct(
  variant: CustomerVariantListItemDto
): StorefrontProduct {
  const isDummyImage =
    variant.primaryImage?.startsWith("/logos/") && variant.primaryImage?.endsWith(".png");

  const imageUrl = !isDummyImage && variant.primaryImage
    ? getImageUrl(variant.primaryImage)
    : resolveSnackFallbackImage(variant.productName || variant.variantName);

  return {
    id: variant.id,
    productId: variant.productId,
    name: variant.productName || variant.variantName,
    image: imageUrl,
    outOfStock: variant.outOfStock,
    isFeatured: Boolean(variant.isFeatured),
    unitPrices: (variant.unitPrices ?? []).map((up) => ({
      id: up.id,
      label: formatMeasurementLabel(up.measurement),
      sku: up.sku,
      basePrice: up.basePrice,
      sellingPrice: up.sellingPrice,
      isDefault: up.isDefault,
    })),
  };
}

/**
 * Maps one real cart line (already resolved to a specific pack size) into
 * the shape ProductCard's "cart" mode renders.
 */
export function mapCartItemToStorefrontProduct(item: CartItemResponse): StorefrontProduct {
  const isDummyImage =
    item.primaryImage?.startsWith("/logos/") && item.primaryImage?.endsWith(".png");

  return {
    id: item.variantId,
    productId: item.productId,
    name: item.variantName || item.productName,
    image: !isDummyImage && item.primaryImage
      ? getImageUrl(item.primaryImage)
      : resolveSnackFallbackImage(item.productName || item.variantName),
    unitPrices: [
      {
        id: item.variantUnitPriceId,
        label: formatMeasurementLabel(item.measurement),
        sku: "",
        // The struck-through price is today's catalog price, so the card
        // shows the offer saving rather than a stale add-to-cart price.
        basePrice: item.basePrice,
        sellingPrice: item.currentPrice,
        isDefault: true,
      },
    ],
  };
}

/**
 * Maps one real wishlist row (already resolved to a specific pack size) into
 * the shape ProductCard's "wishlist" mode renders.
 */
export function mapWishlistItemToStorefrontProduct(
  item: CustomerWishlistItemDto
): StorefrontProduct {
  return {
    id: item.variantId,
    productId: item.product.id,
    name: item.variantName || item.product.name,
    image: item.primaryImage
      ? getImageUrl(item.primaryImage)
      : resolveSnackFallbackImage(item.product.name || item.variantName),
    outOfStock: !item.isAvailable,
    unitPrices: [
      {
        id: item.variantUnitPriceId,
        label: formatMeasurementLabel(item.measurement),
        sku: item.sku,
        basePrice: item.basePrice,
        sellingPrice: item.price,
        isDefault: true,
      },
    ],
  };
}
