import type { PaginationMeta } from "@/lib/api/api-response";
import type { VariantMeasurement } from "../utils/measurement.util";

export * from "../utils/measurement.util";
export type {
  CustomerVariantListItemDto,
  CustomerVariantDetailDto,
  CustomerVariantImageDto,
} from "@/features/customers/types";

export interface CustomerGlobalVariantListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  productIds?: string[];
  brandIds?: string[];
  categoryIds?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  isFeatured?: boolean;
  vegType?: "veg" | "non_veg" | "nonveg" | "vegan" | "na";
  sortBy?:
    | "variantName"
    | "salePrice"
    | "basePrice"
    | "createdAt"
    | "productName";
  sortOrder?: "asc" | "desc";
}

export interface UnitOption {
  id: string;
  name: string;
  code: string;
  type: "weight" | "volume" | "count";
  conversionFactor?: number;
  baseUnitId?: string | null;
}

/**
 * A single (unit, price) combination for a variant, e.g. "500g @ Rs.99".
 * Selling price is NOT stored here - the storefront computes it from
 * basePrice minus any active offer/discount.
 */
export interface VariantUnitPriceResponse {
  id: string; // Public VariantUnitPrice UUID
  variantId: string; // Public Variant UUID
  sku: string;
  basePrice: number;
  measurement: VariantMeasurement;
  unitId: string;
  unitValue?: number;
  unitName?: string;
  unitCode?: string;
  isDefault: boolean;
  isActive: boolean;
  stock?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminVariantResponse {
  id: string; // Public Variant UUID
  productId: string; // Public Product UUID
  productName: string;
  productSlug: string;
  variantName: string; // Stored DB variant_name e.g. "Classic Mixture"
  slug: string;
  shortDescription: string | null;
  description: string | null;
  ingredients: string | null;
  isReadyToMix: boolean;
  cookingRecipe: string | null;
  shelfLife: string | null;
  vegType: "veg" | "nonveg" | "vegan" | "na";
  isFeatured: boolean;
  primaryImage: string | null;
  isActive: boolean;
  outOfStock: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Item-level list of all sellable (unit, price) combinations for this variant.
  unitPrices: VariantUnitPriceResponse[];
  // Convenience fields mirrored from the default (or first) unit price, kept for
  // backward compatibility with UI/consumers that expect a single price/sku per
  // variant row (e.g. admin list tables). Prefer `unitPrices` for anything new.
  measurement?: VariantMeasurement;
  sku?: string;
  basePrice?: number;
  /** @deprecated selling price is now computed on the frontend from basePrice minus any active offer */
  salePrice?: number;
  stock?: number;
  unitId?: string;
  unitValue?: number;
  unitName?: string;
  unitCode?: string;
}

export interface GetAdminVariantsResult {
  data: AdminVariantResponse[];
  meta?: PaginationMeta;
}

export interface AdminVariantImageResponse {
  id: string; // Public Variant Image UUID
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  status: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetAdminVariantsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  productId?: string;
  productUuid?: string;
  isActive?: boolean;
}

export interface AdminVariantListParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  productId?: string;
  productIds?: string[];
  brandIds?: string[];
  categoryIds?: string[];
  measurementTypes?: Array<"weight" | "volume" | "count">;
  unitIds?: string[];
  isActive?: boolean;
  outOfStock?: boolean;
  vegType?: "veg" | "nonveg" | "vegan" | "na";
  minPrice?: number;
  maxPrice?: number;
  sortBy?:
    | "variantName"
    | "productName"
    | "sku"
    | "basePrice"
    | "salePrice"
    | "createdAt"
    | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface VariantPriceHistoryChangedByDto {
  id: string; // user uuid
  name: string;
}

export interface VariantPriceHistoryResponse {
  id: string; // history uuid
  variantUnitPriceId?: string;
  oldPrice: number | null;
  newPrice: number | null;
  oldBasePrice?: number | null;
  newBasePrice?: number | null;
  changedAt: Date | string;
  changedBy: VariantPriceHistoryChangedByDto | null;
}

export interface GetVariantPriceHistoryParams {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  sortOrder?: "asc" | "desc";
}

export interface PriceHistoryChartItem {
  month: string; // "YYYY-MM"
  price: number;
}

export interface BulkEditVariantItem {
  id: string; // variant-unit-price UUID
  price?: number;
  basePrice?: number;
  stock?: number;
  isActive?: boolean;
}

export interface AdminVariantsCountResponse {
  active: number;
  inactive: number;
  inStock: number;
  outOfStock: number;
  veg: number;
  nonveg: number;
  vegan: number;
  na: number;
  all: number;
}

export type { BulkEditVariantsInput, BulkEditVariantItemInput } from "../validations/admin-variant.schema";
export type {
  CreateVariantUnitPriceInput,
  UpdateVariantUnitPriceInput,
} from "../validations/admin-variant-unit-price.schema";
