import type { VariantMeasurement } from "@/features/variants/utils/measurement.util";
import type { OfferBreakdown } from "@/features/offers/types";

export interface CustomerBrandDto {
  id: string; // Brand UUID
  name: string;
  image: string | null;
}

export interface CustomerCategoryDto {
  id: string; // Category UUID
  name: string;
  image: string | null;
}

export interface CustomerProductListItemDto {
  id: string; // Product UUID
  name: string;
  description: string | null;
  brand: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  image: string | null;
  minPrice: number;
  maxPrice: number;
  unitPrices?: Array<{
    id: string;
    label: string;
    basePrice: number;
    sellingPrice: number;
    /** The offer that produced `sellingPrice`, or null when none applied. */
    offer?: OfferBreakdown | null;
    discountAmount?: number;
    discountPercent?: number;
  }>;
}

/**
 * A single sellable pack size ("250g", "500g", "1kg", ...) for a variant/item.
 * Selling price is NOT stored - the repository returns it equal to basePrice,
 * and `catalogOffers` in the customer service layer replaces it with the price
 * the shared offer engine produces before the DTO leaves the server.
 */
export interface CustomerVariantUnitPriceDto {
  id: string; // VariantUnitPrice UUID - this is what cart/wishlist APIs key off
  sku: string;
  measurement: VariantMeasurement;
  basePrice: number;
  sellingPrice: number;
  isDefault: boolean;
  /** The offer that produced `sellingPrice`, or null when none applied. */
  offer?: OfferBreakdown | null;
  discountAmount?: number;
  discountPercent?: number;
}

export interface CustomerVariantListItemDto {
  id: string; // Variant UUID
  productId: string; // Product UUID
  productName: string;
  variantName: string;
  measurement: VariantMeasurement;
  sku: string;
  basePrice: number;
  /** Default pack size's price after offers; mirrors `unitPrices`. */
  salePrice: number;
  primaryImage: string | null;
  images?: CustomerVariantImageDto[];
  outOfStock?: boolean;
  isFeatured: boolean;
  ingredients: string | null;
  isReadyToMix: boolean;
  cookingRecipe: string | null;
  shelfLife: string | null;
  // Full list of sellable pack sizes for this item - an item can have any
  // number of pack sizes, each independently priced. `sku`/`basePrice`/
  // `salePrice`/`measurement` above mirror the default (or first) entry here
  // for backward compatibility with callers that expect a single price/sku.
  unitPrices: CustomerVariantUnitPriceDto[];
}

export interface CustomerVariantImageDto {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CustomerProductImageDto {
  id: string;
  imageUrl: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CustomerVariantDetailDto extends CustomerVariantListItemDto {
  images: CustomerVariantImageDto[];
}

export interface CustomerProductDetailDto {
  id: string; // Product UUID
  name: string;
  description: string | null;
  brand: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  image: string | null;
  images?: CustomerProductImageDto[];
  variants: CustomerVariantListItemDto[];
}

/**
 * One related item returned by the related-products API. It is variant-level
 * (a single representative variant per related product) so the storefront can
 * link/add straight to a sellable item, while still carrying the product,
 * category and brand context the card needs.
 */
export interface CustomerRelatedVariantDto {
  productId: string; // Product UUID
  productName: string;
  variantId: string; // Variant UUID
  variantName: string;
  measurement: VariantMeasurement;
  sku: string;
  /** The pack size `price`/`offerPrice` refer to - what cart APIs key off. */
  unitPriceId: string | null;
  // `price` is the catalog base price; `offerPrice` is what the shared offer
  // engine charges, and is null when no offer applies.
  price: number;
  offerPrice: number | null;
  image: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  subcategory: {
    id: string;
    name: string;
  } | null;
  brand: {
    id: string;
    name: string;
  } | null;
  inStock: boolean;
  stockQuantity: number;
}

export interface CustomerPopularSearchItem {
  keyword: string;
  count: number;
}

export interface CustomerPopularCategoryItem {
  id: string;
  name: string;
  image: string | null;
  count: number;
}

export interface CustomerPopularSearchResponse {
  popularSearches: CustomerPopularSearchItem[];
  popularCategories: CustomerPopularCategoryItem[];
}

export interface CustomerTrackSearchInput {
  keyword: string;
  type?: "search" | "product" | "variant" | "category";
  entityId?: string;
  resultsCount?: number;
}
