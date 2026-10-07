export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  sku: string;
  price: number;
  comparePrice: number | null;
  discountPercent: number;
  isActive: boolean;
  isFeatured: boolean;
  category: { id: number; name: string; slug: string } | null;
  brand: { id: number; name: string; slug: string } | null;
  images: { id: number; url: string; altText: string | null }[];
  _count: { reviews: number; orderItems: number };
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  costPrice: number | null;
  taxRate: number;
  isDigital: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  variants: {
    id: number;
    name: string;
    sku: string;
    price: number;
    comparePrice: number | null;
    stockQuantity: number;
    weight: number | null;
    isActive: boolean;
  }[];
  reviews: {
    id: number;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: Date;
    user: { id: number; name: string; image: string | null };
  }[];
}

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  sort?: string;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface GetProductsResult {
  data: ProductListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateProductInput {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  categoryId: number;
  brandId?: number | null;
  sku: string;
  price: number;
  comparePrice?: number | null;
  costPrice?: number | null;
  taxRate?: number;
  discountPercent?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  isDigital?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export interface AdminProductUnitPrice {
  id: string;
  sku: string;
  basePrice: number;
  unitValue: number;
  unitCode: string;
  unitName: string;
  packSize: string;
  stock: number;
  isDefault: boolean;
}

export interface AdminProductItemVariant {
  id: string;
  name: string;
  slug: string;
  vegType?: string;
  shelfLife?: string | null;
  isActive: boolean;
  outOfStock: boolean;
  unitPrices: AdminProductUnitPrice[];
}

export interface AdminProductResponse {
  id: string; // Public Product UUID
  categoryId: string | null; // Public Category UUID
  categoryName: string | null;
  brandId: string | null; // Public Brand UUID
  brandName: string | null;
  hsnCodeId: string | null; // Public HSN Code UUID
  hsnCodeName: string | null;
  name: string;
  slug: string;
  imageUrl?: string | null;
  status: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  variants?: AdminProductItemVariant[];
  items?: AdminProductItemVariant[];
}

export interface GetAdminProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface AdminProductListParams {
  page?: number;
  limit?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  categoryId?: string;
  brandId?: string;
  hsnCodeId?: string;
  status?: boolean;
  vegType?: string;
  isFeatured?: boolean;
  sortBy?: "name" | "slug" | "createdAt" | "updatedAt" | "status" | "isActive";
  sortOrder?: "asc" | "desc";
}

export interface GetAdminProductsResult {
  data: AdminProductResponse[];
  meta?: {
    page: number;
    limit: number;
    pageSize?: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminProductsCountResponse {
  active: number;
  inactive: number;
  all: number;
}

export interface AdminProductImageResponse {
  id: string; // Public Product Image ID
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Customer-facing product/variant DTOs (real schema-backed shapes, used by the
// storefront - see src/features/customers/types/catalog.types.ts for the
// source of truth).
export type {
  CustomerProductListItemDto,
  CustomerProductDetailDto,
  CustomerVariantListItemDto,
  CustomerVariantUnitPriceDto,
} from "@/features/customers/types";

export interface CustomerProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  brandIds?: string[];
  categoryIds?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  sortBy?: "name" | "price" | "createdAt";
  sortOrder?: "asc" | "desc";
}

